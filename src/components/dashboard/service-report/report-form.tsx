"use client";

import React, { useEffect, useMemo, useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { collection, doc, writeBatch, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { v4 as uuidv4 } from "uuid";
import { db, storage } from "@/firebase"; // Importação direta (sem import dinâmico)
import type { Client, Appointment, ServiceReport, ServiceLocation, Technician } from "@/lib/types";

// Importações de UI básicas (se não funcionar, usar elementos nativos)
import { AlertTriangle, CheckCircle, WifiOff, RefreshCw, UploadCloud, X } from "lucide-react";

// CONSTANTES (mantém igual)
const waterParameters = [
  { name: "Cloro", key: "chlorine", min: 0, max: 5, step: 0.1, defaultValue: 2.5, unit: "ppm" },
  { name: "pH", key: "ph", min: 6, max: 9, step: 0.1, defaultValue: 7.4, unit: "" },
  { name: "Alcalinidade", key: "alkalinity", min: 0, max: 200, step: 10, defaultValue: 100, unit: "ppm" },
  { name: "Ác. Cianúrico (CYA)", key: "cya", min: 0, max: 100, step: 5, defaultValue: 30, unit: "ppm" },
  { name: "Dureza Cálcica", key: "calciumHardness", min: 0, max: 500, step: 10, defaultValue: 250, unit: "ppm" },
  { name: "ORP", key: "orp", min: 0, max: 1000, step: 10, defaultValue: 650, unit: "mV" },
  { name: "TDS", key: "tds", min: 0, max: 3000, step: 100, defaultValue: 1500, unit: "ppm" },
  { name: "Temperatura", key: "temperature", min: 0, max: 40, step: 1, defaultValue: 25, unit: "°C" },
];

const servicesPerformedItems = [
  { id: "asp_filtrando", label: "Aspiração filtrando" },
  { id: "asp_drenando", label: "Aspiração drenando" },
  { id: "escovacao", label: "Escovação" },
  { id: "peneiracao", label: "Peneiração" },
  { id: "limpeza_bordas", label: "Limpeza de bordas" },
  { id: "limpeza_pre_filtro", label: "Limpeza pré-filtro" },
  { id: "retrolavagem_filtro", label: "Retrolavagem do elemento filtrante" },
  { id: "lavagem_filtro_poliester", label: "Lavagem filtro poliéster (Sistema Dry Pump IGUI)" },
];

const missingProductsItems = [
  { id: "cloro_granulado", label: "Cloro Granulado 10kg" },
  { id: "barrilha_leve", label: "Barrilha leve (elevador de pH)" },
  { id: "bicarbonato_sodio", label: "Bicarbonato de sódio (elevador de alcalinidade)" },
  { id: "clarificante", label: "Clarificante" },
  { id: "algicida_manutencao", label: "Algicida manutenção" },
  { id: "algicida_choque", label: "Algicida choque" },
  { id: "oxidante", label: "Oxidante" },
  { id: "gel_clarificante", label: "Gel clarificante" },
  { id: "eliminador_oleosidade", label: "Eliminador de oleosidade" },
  { id: "acido_cloridrico", label: "Ácido clorídrico (redutor de pH)" },
  { id: "sal_nao_iodado", label: "Sal não iodado" },
];

// Tipos para fila offline
type PendingReport = {
  id: string;
  createdAt: string;
  franchiseId: string;
  appointmentId: string;
  clientId: string;
  locationId: string;
  technicianId: string;
  parameters: Record<string, number>;
  servicesPerformed: string[];
  missingProducts: string[];
  observations: string;
  photoDataUrls: string[];
  serviceReportId?: string;
};

const OFFLINE_QUEUE_KEY = "pool_service_reports_pending_v1";

// Funções para fila offline (mantém igual)
function safeParse<T>(value: string | null): T | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

function readQueue(): PendingReport[] {
  return safeParse<PendingReport[]>(localStorage.getItem(OFFLINE_QUEUE_KEY)) ?? [];
}

function writeQueue(queue: PendingReport[]) {
  localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
}

function enqueuePending(report: PendingReport) {
  const q = readQueue();
  q.unshift(report);
  writeQueue(q);
}

function removePending(id: string) {
  writeQueue(readQueue().filter((x) => x.id !== id));
}

// Funções para imagens (simplificadas)
async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Falha ao ler a imagem"));
    reader.readAsDataURL(file);
  });
}

// COMPONENTE PRINCIPAL CORRIGIDO
export function ServiceReportForm({ 
  appointmentId, 
  franchiseId 
}: { 
  appointmentId: string; 
  franchiseId: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [online, setOnline] = useState(typeof navigator !== "undefined" ? navigator.onLine : true);
  const [pendingCount, setPendingCount] = useState(0);
  
  // Dados do atendimento
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [client, setClient] = useState<Client | null>(null);
  const [location, setLocation] = useState<ServiceLocation | null>(null);
  const [technician, setTechnician] = useState<Technician | null>(null);
  
  // Estado do formulário
  const [previews, setPreviews] = useState<(string | null)[]>([null, null, null, null]);
  const [parameters, setParameters] = useState<Record<string, number>>(
    Object.fromEntries(waterParameters.map((p) => [p.key, p.defaultValue]))
  );
  const [servicesPerformed, setServicesPerformed] = useState<string[]>([]);
  const [missingProducts, setMissingProducts] = useState<string[]>([]);
  const [observations, setObservations] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Carregar dados
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        
        // Carregar appointment
        const appointmentDoc = await getDoc(doc(db, `franchises/${franchiseId}/appointments`, appointmentId));
        
        if (!appointmentDoc.exists()) {
          throw new Error("Atendimento não encontrado");
        }
        
        const appointmentData = { id: appointmentDoc.id, ...appointmentDoc.data() } as Appointment;
        setAppointment(appointmentData);
        
        // Carregar dados relacionados
        if (appointmentData.clientId) {
          const clientDoc = await getDoc(doc(db, `franchises/${franchiseId}/clients`, appointmentData.clientId));
          if (clientDoc.exists()) {
            setClient({ id: clientDoc.id, ...clientDoc.data() } as Client);
          }
        }
        
        if (appointmentData.locationId) {
          const locationDoc = await getDoc(doc(db, `franchises/${franchiseId}/locations`, appointmentData.locationId));
          if (locationDoc.exists()) {
            setLocation({ id: locationDoc.id, ...locationDoc.data() } as ServiceLocation);
          }
        }
        
        if (appointmentData.technicianId) {
          const technicianDoc = await getDoc(doc(db, `franchises/${franchiseId}/technicians`, appointmentData.technicianId));
          if (technicianDoc.exists()) {
            setTechnician({ id: technicianDoc.id, ...technicianDoc.data() } as Technician);
          }
        }
        
      } catch (error) {
        console.error("Erro ao carregar dados:", error);
        setError("Erro ao carregar dados do atendimento");
      } finally {
        setLoading(false);
      }
    }
    
    if (appointmentId && franchiseId) {
      loadData();
    }
  }, [appointmentId, franchiseId]);

  // Monitorar online/offline
  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Handlers simplificados
  const handleParameterChange = (key: string, value: number) => {
    setParameters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleCheckboxChange = (setter: React.Dispatch<React.SetStateAction<string[]>>, value: string, checked: boolean) => {
    setter(prev => 
      checked ? [...prev, value] : prev.filter(x => x !== value)
    );
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    try {
      if (file.size > 5 * 1024 * 1024) {
        alert("Arquivo muito grande (máx: 5MB)");
        return;
      }
      
      const dataUrl = await fileToDataUrl(file);
      setPreviews(prev => {
        const newPreviews = [...prev];
        newPreviews[index] = dataUrl;
        return newPreviews;
      });
    } catch (error) {
      console.error("Erro ao processar imagem:", error);
      alert("Erro ao processar imagem");
    }
  };

  const clearPreview = (index: number) => {
    setPreviews(prev => {
      const newPreviews = [...prev];
      newPreviews[index] = null;
      return newPreviews;
    });
    const input = document.getElementById(`photo-${index}`) as HTMLInputElement;
    if (input) input.value = "";
  };

  // Função para converter base64 para blob
  function dataURLtoBlob(dataurl: string) {
    const arr = dataurl.split(',');
    if (arr.length < 2) return null;
    const mimeMatch = arr[0].match(/:(.*?);/);
    const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
  }

  // Enviar relatório com tratamento de CORS
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!appointment || !technician) {
      alert("Dados incompletos");
      return;
    }
    
    setSaving(true);
    setError(null);
    
    try {
      const reportId = appointment.serviceReportId || uuidv4();
      const reportRef = doc(db, `franchises/${franchiseId}/serviceReports`, reportId);
      
      // 1. Preparar dados básicos do relatório
      const reportData: any = {
        id: reportId,
        franchiseId,
        appointmentId: appointment.id,
        technicianId: technician.id,
        clientId: appointment.clientId,
        locationId: appointment.locationId,
        ...parameters,
        servicesPerformed,
        missingProducts,
        observations,
        photoUrls: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: 'completed'
      };
      
      // 2. Primeiro salva o relatório sem fotos (mais rápido)
      await setDoc(reportRef, reportData, { merge: true });
      
      // 3. Upload das fotos (se houver) - pode ser feito depois
      const photoUrls: string[] = [];
      const photosToUpload = previews.filter(Boolean) as string[];
      
      for (let i = 0; i < photosToUpload.length; i++) {
        const dataUrl = photosToUpload[i];
        if (!dataUrl.startsWith('data:')) {
          photoUrls.push(dataUrl); // Mantém URL existente se não for base64
          continue;
        }
        
        try {
          const blob = dataURLtoBlob(dataUrl);
          if (!blob) continue;
          
          const path = `service-reports/${franchiseId}/${appointmentId}/${uuidv4()}.jpg`;
          const storageRef = ref(storage, path);
          
          await uploadBytes(storageRef, blob);
          const url = await getDownloadURL(storageRef);
          photoUrls.push(url);
        } catch (uploadError) {
          console.error(`Erro no upload da foto ${i + 1}:`, uploadError);
          // Continua mesmo se uma foto falhar
        }
      }
      
      // 4. Atualiza o relatório com as URLs das fotos
      if (photoUrls.length > 0) {
        await updateDoc(reportRef, {
          photoUrls,
          updatedAt: new Date().toISOString()
        });
      }
      
      // 5. Atualiza o agendamento
      const appointmentRef = doc(db, `franchises/${franchiseId}/appointments`, appointmentId);
      await updateDoc(appointmentRef, {
        serviceReportId: reportId,
        status: "completed",
      });
      
      // 6. Sucesso
      alert("Relatório enviado com sucesso!");
      setSuccess(true);
      
      // Redireciona após 2 segundos
      setTimeout(() => {
        router.push("/dashboard/schedule");
      }, 2000);
      
    } catch (error: any) {
      console.error("Erro completo ao salvar relatório:", error);
      setError(error.message || "Erro ao enviar relatório");
      
      // Fallback: salvar localmente
      try {
        const pendingReport: PendingReport = {
          id: uuidv4(),
          createdAt: new Date().toISOString(),
          franchiseId,
          appointmentId: appointment.id,
          clientId: appointment.clientId,
          locationId: appointment.locationId,
          technicianId: technician.id,
          parameters,
          servicesPerformed,
          missingProducts,
          observations,
          photoDataUrls: previews.filter(Boolean) as string[],
          serviceReportId: appointment.serviceReportId,
        };
        
        enqueuePending(pendingReport);
        alert("Relatório salvo localmente. Será enviado quando houver conexão.");
        setSuccess(true);
      } catch (fallbackError) {
        alert("Erro crítico! Por favor, anote os dados e tente novamente mais tarde.");
      }
    } finally {
      setSaving(false);
    }
  };

  // Sincronizar pendentes - versão simplificada
  const syncPendingReports = async () => {
    if (!online) {
      alert("Você está offline. Conecte-se à internet para sincronizar.");
      return;
    }
    
    setSaving(true);
    
    while(true) {
      const queue = readQueue();
      if(queue.length === 0) break;
      
      const pending = queue[0];
      try {
          const reportId = pending.serviceReportId || uuidv4();
          const reportRef = doc(db, `franchises/${pending.franchiseId}/serviceReports`, reportId);
          
          // Dados básicos
          const reportData: any = {
            id: reportId,
            franchiseId: pending.franchiseId,
            appointmentId: pending.appointmentId,
            technicianId: pending.technicianId,
            clientId: pending.clientId,
            locationId: pending.locationId,
            ...pending.parameters,
            servicesPerformed: pending.servicesPerformed,
            missingProducts: pending.missingProducts,
            observations: pending.observations,
            photoUrls: [],
            createdAt: pending.createdAt,
            updatedAt: new Date().toISOString(),
            status: 'completed'
          };
          
          await setDoc(reportRef, reportData, { merge: true });
          
          // Upload de fotos
          const photoUrls: string[] = [];
          for (const dataUrl of pending.photoDataUrls) {
            if(dataUrl.startsWith('http')) {
              photoUrls.push(dataUrl);
              continue;
            }
            if (dataUrl.startsWith('data:')) {
              try {
                const blob = dataURLtoBlob(dataUrl);
                if(!blob) continue;
                const path = `service-reports/${pending.franchiseId}/${pending.appointmentId}/${uuidv4()}.jpg`;
                const storageRef = ref(storage, path);
                await uploadBytes(storageRef, blob);
                const url = await getDownloadURL(storageRef);
                photoUrls.push(url);
              } catch (photoError) {
                console.error("Erro ao enviar foto pendente:", photoError);
              }
            }
          }
          
          // Atualizar com fotos
          if (photoUrls.length > 0) {
            await updateDoc(reportRef, {
              photoUrls,
              updatedAt: new Date().toISOString()
            });
          }
          
          // Atualizar appointment
          const appointmentRef = doc(db, `franchises/${pending.franchiseId}/appointments`, pending.appointmentId);
          await updateDoc(appointmentRef, {
            serviceReportId: reportId,
            status: "completed",
          });
          
          removePending(pending.id);
      } catch (singleError) {
          console.error(`Erro ao sincronizar relatório ${pending.id}:`, singleError);
          break; // Para a sincronização se um item falhar
      }
    }
    setPendingCount(readQueue().length);
    if (readQueue().length === 0) {
      alert("Todos os relatórios foram sincronizados!");
    } else {
      alert("Alguns relatórios podem não ter sido sincronizados.");
    }
    setSaving(false);
  };

  // Estados de carregamento
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
        <p className="text-gray-600">Carregando dados do atendimento...</p>
      </div>
    );
  }

  if (error && !appointment) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] p-4">
        <div className="text-red-500 text-lg mb-4">⚠️</div>
        <h2 className="text-xl font-bold mb-2">Erro ao carregar atendimento</h2>
        <p className="text-gray-600 text-center mb-4">{error}</p>
        <button
          onClick={() => router.push("/dashboard/schedule")}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Voltar para Agenda
        </button>
      </div>
    );
  }

  if (success) {
    return (
      <div className="space-y-6 p-4">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">Relatório de Atendimento</h1>
          <p className="text-gray-600">
            Cliente: <span className="font-semibold">{client?.name}</span>
          </p>
          <p className="text-gray-600">
            Endereço: <span className="font-semibold">{location?.address}</span>
          </p>
        </div>
        
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <div className="h-5 w-5 text-green-600 mt-0.5">✅</div>
            <div>
              <h3 className="font-semibold text-green-800">Pronto!</h3>
              <p className="text-green-700 mt-1">
                {online
                  ? "Relatório enviado com sucesso!"
                  : "Você está offline. O relatório foi salvo localmente e será enviado quando voltar o sinal."}
              </p>
              
              {pendingCount > 0 && (
                <div className="mt-3">
                  <p className="text-green-700">
                    Você ainda tem <span className="font-bold">{pendingCount}</span> relatório(s) pendente(s).
                  </p>
                  {online && (
                    <button
                      onClick={syncPendingReports}
                      disabled={saving}
                      className="mt-2 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                    >
                      {saving ? "Sincronizando..." : "Sincronizar agora"}
                    </button>
                  )}
                </div>
              )}
              
              <button
                onClick={() => router.push("/dashboard/schedule")}
                className="mt-4 w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Voltar para a Agenda
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Renderizar formulário
  return (
    <div className="p-4 max-w-6xl mx-auto">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="text-red-500">⚠️</div>
            <p className="text-red-700">{error}</p>
          </div>
        </div>
      )}
      
      <div className="space-y-2 mb-6">
        <h1 className="text-2xl font-bold">Relatório de Atendimento</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <p className="text-gray-600">
            <span className="font-semibold">Cliente:</span> {client?.name}
          </p>
          <p className="text-gray-600">
            <span className="font-semibold">Endereço:</span> {location?.address}
          </p>
          <p className="text-gray-600">
            <span className="font-semibold">Técnico:</span> {technician?.firstName} {technician?.lastName}
          </p>
          <p className="text-gray-600">
            <span className="font-semibold">Data:</span> {new Date().toLocaleDateString('pt-BR')}
          </p>
        </div>
      </div>

      {!online && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3">
            <div className="text-yellow-600 mt-0.5">📶</div>
            <div>
              <h3 className="font-semibold text-yellow-800">Modo offline</h3>
              <p className="text-yellow-700">
                Sem internet agora. Ao finalizar, o relatório será salvo no celular e enviado automaticamente quando o sinal voltar.
              </p>
            </div>
          </div>
        </div>
      )}

      {pendingCount > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <p className="text-blue-800">
                Você tem <span className="font-bold">{pendingCount}</span> relatório(s) aguardando sincronização.
              </p>
            </div>
            <button
              type="button"
              onClick={syncPendingReports}
              disabled={saving || !online}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center"
            >
              <span className="mr-2">🔄</span>
              {saving ? "Sincronizando..." : "Sincronizar agora"}
            </button>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Coluna esquerda - Parâmetros e Fotos */}
          <div className="space-y-6">
            {/* Parâmetros da Água */}
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h2 className="text-lg font-semibold mb-4">Parâmetros da Água</h2>
              <div className="space-y-5">
                {waterParameters.map((param) => (
                  <div key={param.key} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label htmlFor={param.key} className="font-medium">
                        {param.name}
                      </label>
                      <span className="text-sm font-semibold text-blue-600">
                        {parameters[param.key]} {param.unit}
                      </span>
                    </div>
                    <input
                      type="range"
                      id={param.key}
                      name={param.key}
                      min={param.min}
                      max={param.max}
                      step={param.step}
                      value={parameters[param.key]}
                      onChange={(e) => handleParameterChange(param.key, parseFloat(e.target.value))}
                      disabled={saving}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-600"
                    />
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>{param.min} {param.unit}</span>
                      <span>{param.max} {param.unit}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Fotos */}
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h2 className="text-lg font-semibold mb-2">Fotos do Serviço</h2>
              <p className="text-sm text-gray-600 mb-4">Até 4 fotos (tire bem perto da área tratada)</p>
              
              <div className="grid grid-cols-2 gap-4">
                {[0, 1, 2, 3].map((index) => (
                  <div key={index} className="space-y-2">
                    {previews[index] ? (
                      <div className="relative">
                        <img
                          src={previews[index] as string}
                          alt={`Foto ${index + 1}`}
                          className="w-full aspect-[3/4] object-cover rounded-lg border border-gray-300"
                        />
                        <button
                          type="button"
                          onClick={() => clearPreview(index)}
                          disabled={saving}
                          className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full hover:bg-red-600"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <label
                        htmlFor={`photo-${index}`}
                        className="flex flex-col items-center justify-center w-full aspect-[3/4] border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-500 bg-gray-50 transition-colors"
                      >
                        <div className="flex flex-col items-center justify-center p-4">
                          <div className="text-2xl mb-2 text-gray-400">📷</div>
                          <p className="text-xs text-gray-500 text-center">
                            Clique para tirar foto
                          </p>
                        </div>
                        <input
                          id={`photo-${index}`}
                          type="file"
                          accept="image/*"
                          capture="environment"
                          onChange={(e) => handleFileChange(e, index)}
                          disabled={saving}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Coluna direita - Serviços, Produtos, Observações */}
          <div className="space-y-6">
            {/* Serviços Realizados */}
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h2 className="text-lg font-semibold mb-4">Serviços Realizados</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {servicesPerformedItems.map((item) => (
                  <div key={item.id} className="flex items-center">
                    <input
                      type="checkbox"
                      id={`service-${item.id}`}
                      checked={servicesPerformed.includes(item.label)}
                      onChange={(e) => handleCheckboxChange(setServicesPerformed, item.label, e.target.checked)}
                      disabled={saving}
                      className="h-5 w-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                    />
                    <label
                      htmlFor={`service-${item.id}`}
                      className="ml-2 text-sm cursor-pointer"
                    >
                      {item.label}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {/* Produtos Faltantes */}
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h2 className="text-lg font-semibold mb-4">Produtos Faltantes</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {missingProductsItems.map((item) => (
                  <div key={item.id} className="flex items-center">
                    <input
                      type="checkbox"
                      id={`product-${item.id}`}
                      checked={missingProducts.includes(item.label)}
                      onChange={(e) => handleCheckboxChange(setMissingProducts, item.label, e.target.checked)}
                      disabled={saving}
                      className="h-5 w-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                    />
                    <label
                      htmlFor={`product-${item.id}`}
                      className="ml-2 text-sm cursor-pointer"
                    >
                      {item.label}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {/* Observações */}
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h2 className="text-lg font-semibold mb-4">Observações</h2>
              <textarea
                id="observations"
                value={observations}
                onChange={(e) => setObservations(e.target.value)}
                disabled={saving}
                placeholder="Alguma observação importante sobre o serviço ou a piscina..."
                rows={4}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
              />
            </div>

            {/* Botão de envio */}
            <div className="sticky bottom-4 bg-white p-4 border-t border-gray-200 rounded-lg shadow-lg">
              <button
                type="submit"
                disabled={saving}
                className="w-full py-4 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-lg flex items-center justify-center"
              >
                {saving ? (
                  <>
                    <span className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></span>
                    Enviando...
                  </>
                ) : (
                  "✅ Finalizar Relatório"
                )}
              </button>
              
              {saving && (
                <p className="text-center text-sm text-gray-600 mt-2">
                  Isso pode levar alguns segundos...
                </p>
              )}
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}