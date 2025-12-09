"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { collection, doc, writeBatch, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { v4 as uuidv4 } from "uuid";
import { db, storage } from "@/firebase";

// CONSTANTES (simplificadas para teste)
const waterParameters = [
  { name: "Cloro", key: "chlorine", min: 0, max: 5, step: 0.1, defaultValue: 2.5, unit: "ppm" },
  { name: "pH", key: "ph", min: 6, max: 9, step: 0.1, defaultValue: 7.4, unit: "" },
];

const servicesPerformedItems = [
  { id: "asp_filtrando", label: "Aspiração filtrando" },
  { id: "asp_drenando", label: "Aspiração drenando" },
];

const missingProductsItems = [
  { id: "cloro_granulado", label: "Cloro Granulado 10kg" },
  { id: "barrilha_leve", label: "Barrilha leve (elevador de pH)" },
];

// Funções auxiliares
async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Falha ao ler a imagem"));
    reader.readAsDataURL(file);
  });
}

// COMPONENTE SIMPLIFICADO PARA TESTE
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
  
  // Dados
  const [appointment, setAppointment] = useState<any>(null);
  const [client, setClient] = useState<any>(null);
  const [location, setLocation] = useState<any>(null);
  
  // Formulário
  const [parameters, setParameters] = useState<Record<string, number>>(
    Object.fromEntries(waterParameters.map((p) => [p.key, p.defaultValue]))
  );
  const [servicesPerformed, setServicesPerformed] = useState<string[]>([]);
  const [missingProducts, setMissingProducts] = useState<string[]>([]);
  const [observations, setObservations] = useState("");
  const [testMode, setTestMode] = useState(true); // Modo teste: sem fotos

  // Carregar dados básicos
  useEffect(() => {
    async function loadData() {
      try {
        // 1. Testar Firestore primeiro
        console.log("Testando conexão com Firestore...");
        
        // Carregar appointment
        const appointmentDoc = await getDoc(doc(db, `franchises/${franchiseId}/appointments`, appointmentId));
        
        if (!appointmentDoc.exists()) {
          throw new Error("Atendimento não encontrado");
        }
        
        const appointmentData = { id: appointmentDoc.id, ...appointmentDoc.data() };
        setAppointment(appointmentData);
        console.log("Appointment carregado:", appointmentData.id);
        
        // Carregar cliente
        if (appointmentData.clientId) {
          const clientDoc = await getDoc(doc(db, `franchises/${franchiseId}/clients`, appointmentData.clientId));
          if (clientDoc.exists()) {
            const clientData = { id: clientDoc.id, ...clientDoc.data() };
            setClient(clientData);
            console.log("Cliente carregado:", clientData.name);
          }
        }
        
        // Carregar localização
        if (appointmentData.locationId) {
          const locationDoc = await getDoc(doc(db, `franchises/${franchiseId}/locations`, appointmentData.locationId));
          if (locationDoc.exists()) {
            const locationData = { id: locationDoc.id, ...locationDoc.data() };
            setLocation(locationData);
            console.log("Localização carregada:", locationData.address);
          }
        }
        
        console.log("✅ Todos os dados carregados com sucesso");
        
      } catch (error: any) {
        console.error("❌ Erro ao carregar dados:", error);
        alert(`Erro ao carregar dados: ${'${error.message}'}\n\nVerifique se o Firestore está configurado corretamente.`);
      } finally {
        setLoading(false);
      }
    }
    
    loadData();
  }, [appointmentId, franchiseId]);

  // TESTE 1: Verificar Firestore e Storage
  const testConnection = async () => {
    try {
      console.log("🧪 Iniciando teste de conexão...");
      
      // Teste 1: Firestore (escrita)
      const testRef = doc(collection(db, "_test"));
      const testData = {
        test: true,
        timestamp: new Date().toISOString(),
        message: "Teste de conexão Firestore"
      };
      
      console.log("Testando escrita no Firestore...");
      await setDoc(testRef, testData);
      console.log("✅ Firestore: Escrita OK");
      
      // Teste 2: Storage (upload pequeno)
      const testBlob = new Blob(["test content"], { type: "text/plain" });
      const testStorageRef = ref(storage, `_test/${'${Date.now()}'}.txt`);
      
      console.log("Testando upload no Storage...");
      await uploadBytes(testStorageRef, testBlob);
      console.log("✅ Storage: Upload OK");
      
      alert("✅ Conexões testadas com sucesso!\n\nFirestore: OK\nStorage: OK\n\nAgora você pode enviar o relatório.");
      setTestMode(false);
      
    } catch (error: any) {
      console.error("❌ Teste falhou:", error);
      
      if (error.code === "storage/unauthorized") {
        alert("❌ Storage não autorizado!\n\n1. Vá no Firebase Console\n2. Storage > Rules\n3. Configure para permitir leitura/escrita");
      } else if (error.code === "permission-denied") {
        alert("❌ Permissão negada no Firestore!\n\n1. Vá no Firebase Console\n2. Firestore > Rules\n3. Configure para permitir leitura/escrita");
      } else {
        alert(`❌ Erro de conexão: ${'${error.message}'}\n\nVerifique suas configurações do Firebase.`);
      }
    }
  };

  // ENVIO SIMPLIFICADO - APENAS DADOS BÁSICOS (SEM FOTOS)
  const handleSubmitBasic = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!appointment || !client || !location) {
      alert("Dados incompletos");
      return;
    }
    
    if (saving) return;
    
    setSaving(true);
    console.log("🔄 Iniciando envio simplificado (sem fotos)...");
    
    try {
      // 1. Criar ID do relatório
      const reportId = appointment.serviceReportId || uuidv4();
      const reportRef = doc(db, `franchises/${franchiseId}/serviceReports`, reportId);
      
      // 2. Dados básicos do relatório
      const reportData = {
        id: reportId,
        franchiseId,
        appointmentId: appointment.id,
        clientId: appointment.clientId,
        locationId: appointment.locationId,
        technicianId: appointment.technicianId || "default-technician",
        ...parameters,
        servicesPerformed,
        missingProducts,
        observations,
        photoUrls: [], // Vazio por enquanto
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: 'completed',
        testMode: testMode
      };
      
      console.log("Salvando no Firestore...", reportData);
      
      // 3. Usar batch para garantir atomicidade
      const batch = writeBatch(db);
      
      // Salvar relatório
      batch.set(reportRef, reportData, { merge: true });
      
      // Atualizar appointment
      const appointmentRef = doc(db, `franchises/${franchiseId}/appointments`, appointmentId);
      batch.update(appointmentRef, {
        serviceReportId: reportId,
        status: "completed",
        updatedAt: new Date().toISOString(),
      });
      
      // Executar batch
      await batch.commit();
      
      console.log("✅ Relatório salvo com sucesso!");
      
      // Feedback ao usuário
      alert(`✅ Relatório #${'${reportId.substring(0, 8)}'} enviado!\n\nCliente: ${'${client.name}'}\nData: ${'${new Date().toLocaleDateString(\'pt-BR\')}'}`);
      
      setSuccess(true);
      
      // Redirecionar após 3 segundos
      setTimeout(() => {
        router.push("/dashboard/schedule");
      }, 3000);
      
    } catch (error: any) {
      console.error("❌ Erro ao salvar:", error);
      
      // Análise detalhada do erro
      let errorMessage = "Erro desconhecido";
      
      if (error.code) {
        switch (error.code) {
          case "permission-denied":
            errorMessage = "Permissão negada no Firestore. Verifique as regras de segurança.";
            break;
          case "unavailable":
            errorMessage = "Firestore indisponível. Verifique sua conexão.";
            break;
          case "resource-exhausted":
            errorMessage = "Limite de requisições excedido. Tente novamente mais tarde.";
            break;
          default:
            errorMessage = `Código de erro: ${'${error.code}'}`;
        }
      } else {
        errorMessage = error.message || "Erro ao conectar com o servidor";
      }
      
      alert(`❌ Falha ao enviar: ${'${errorMessage}'}\n\nConsulte o console para mais detalhes.`);
      
    } finally {
      setSaving(false);
    }
  };

  // ENVIO COMPLETO (COM FOTOS - OPÇÃO FUTURA)
  const handleSubmitWithPhotos = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Primeiro testa conexão
    await testConnection();
    
    if (testMode) {
      alert("Por favor, teste a conexão primeiro antes de enviar com fotos.");
      return;
    }
    
    // Depois implemente o upload de fotos aqui
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] p-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
        <p className="text-gray-600">Carregando dados do atendimento...</p>
        <p className="text-sm text-gray-500 mt-2">Verificando conexão com o banco de dados...</p>
      </div>
    );
  }

  if (!appointment) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] p-4">
        <div className="text-red-500 text-4xl mb-4">❌</div>
        <h2 className="text-xl font-bold mb-2">Atendimento não encontrado</h2>
        <p className="text-gray-600 text-center mb-4">
          O ID {appointmentId} não existe ou você não tem permissão para acessá-lo.
        </p>
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
        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="text-green-500 text-3xl">✅</div>
            <div>
              <h2 className="text-xl font-bold text-green-800">Relatório Enviado!</h2>
              <p className="text-green-700">Os dados foram salvos com sucesso no sistema.</p>
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-lg mb-4">
            <h3 className="font-semibold mb-2">Resumo do Relatório</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div><span className="font-medium">Cliente:</span> {client?.name}</div>
              <div><span className="font-medium">Endereço:</span> {location?.address}</div>
              <div><span className="font-medium">Serviços:</span> {servicesPerformed.length}</div>
              <div><span className="font-medium">Produtos faltantes:</span> {missingProducts.length}</div>
            </div>
          </div>
          
          <button
            onClick={() => router.push("/dashboard/schedule")}
            className="w-full py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700"
          >
            Voltar para Agenda
          </button>
          
          <p className="text-center text-sm text-gray-600 mt-4">
            Redirecionando em 3 segundos...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <div className="space-y-2 mb-6">
        <h1 className="text-2xl font-bold">📋 Relatório de Atendimento</h1>
        <div className="bg-blue-50 p-4 rounded-lg">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <p><span className="font-medium">Cliente:</span> {client?.name || "Não encontrado"}</p>
            <p><span className="font-medium">Endereço:</span> {location?.address || "Não informado"}</p>
            <p><span className="font-medium">ID Atendimento:</span> {appointmentId.substring(0, 8)}</p>
            <p><span className="font-medium">Data:</span> {new Date().toLocaleDateString('pt-BR')}</p>
          </div>
        </div>
      </div>

      {/* BOTÃO DE TESTE DE CONEXÃO */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-yellow-800">⚠️ Teste de Conexão Recomendado</h3>
            <p className="text-yellow-700 text-sm">
              Antes de enviar, verifique se as conexões com Firestore e Storage estão funcionando.
            </p>
          </div>
          <button
            onClick={testConnection}
            disabled={saving}
            className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 disabled:opacity-50"
          >
            Testar Conexão
          </button>
        </div>
      </div>

      {/* FORMULÁRIO SIMPLIFICADO */}
      <form onSubmit={handleSubmitBasic} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Parâmetros da Água */}
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <h2 className="text-lg font-semibold mb-4">💧 Parâmetros da Água</h2>
            <div className="space-y-4">
              {waterParameters.map((param) => (
                <div key={param.key} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="font-medium">{param.name}</label>
                    <span className="font-bold text-blue-600">
                      {parameters[param.key]} {param.unit}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={param.min}
                    max={param.max}
                    step={param.step}
                    value={parameters[param.key]}
                    onChange={(e) => setParameters(prev => ({
                      ...prev,
                      [param.key]: parseFloat(e.target.value)
                    }))}
                    disabled={saving}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>{param.min}{param.unit}</span>
                    <span>{param.max}{param.unit}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Serviços e Produtos */}
          <div className="space-y-6">
            {/* Serviços Realizados */}
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h2 className="text-lg font-semibold mb-4">🔧 Serviços Realizados</h2>
              <div className="space-y-2">
                {servicesPerformedItems.map((item) => (
                  <div key={item.id} className="flex items-center">
                    <input
                      type="checkbox"
                      id={`service-${'${item.id}'}`}
                      checked={servicesPerformed.includes(item.label)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setServicesPerformed(prev => [...prev, item.label]);
                        } else {
                          setServicesPerformed(prev => prev.filter(x => x !== item.label));
                        }
                      }}
                      disabled={saving}
                      className="h-5 w-5 text-blue-600 rounded"
                    />
                    <label htmlFor={`service-${'${item.id}'}`} className="ml-2 text-sm">
                      {item.label}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {/* Produtos Faltantes */}
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h2 className="text-lg font-semibold mb-4">📦 Produtos Faltantes</h2>
              <div className="space-y-2">
                {missingProductsItems.map((item) => (
                  <div key={item.id} className="flex items-center">
                    <input
                      type="checkbox"
                      id={`product-${'${item.id}'}`}
                      checked={missingProducts.includes(item.label)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setMissingProducts(prev => [...prev, item.label]);
                        } else {
                          setMissingProducts(prev => prev.filter(x => x !== item.label));
                        }
                      }}
                      disabled={saving}
                      className="h-5 w-5 text-blue-600 rounded"
                    />
                    <label htmlFor={`product-${'${item.id}'}`} className="ml-2 text-sm">
                      {item.label}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Observações */}
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-4">📝 Observações</h2>
          <textarea
            value={observations}
            onChange={(e) => setObservations(e.target.value)}
            disabled={saving}
            placeholder="Descreva qualquer observação importante sobre o serviço..."
            rows={3}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* MODOS DE ENVIO */}
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-4">🚀 Enviar Relatório</h2>
          
          <div className="space-y-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="font-semibold text-blue-800 mb-2">🎯 Modo Simplificado (Recomendado)</h3>
              <p className="text-blue-700 text-sm mb-3">
                Envia apenas os dados do relatório, sem fotos. Ideal para testar a conexão.
              </p>
              <button
                type="submit"
                disabled={saving}
                className="w-full py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50 flex items-center justify-center"
              >
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                    Enviando...
                  </>
                ) : (
                  "✅ Enviar Relatório (Sem Fotos)"
                )}
              </button>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg opacity-70">
              <h3 className="font-semibold text-gray-600 mb-2">📸 Modo Completo (Com Fotos)</h3>
              <p className="text-gray-600 text-sm mb-3">
                Inclui fotos do serviço. Requer conexão estável com Storage.
              </p>
              <button
                type="button"
                onClick={() => alert("Funcionalidade de fotos será implementada após testar a conexão básica")}
                disabled={true}
                className="w-full py-3 bg-gray-400 text-white rounded-lg font-semibold cursor-not-allowed"
              >
                ⏳ Disponível em Breve
              </button>
            </div>
          </div>

          {saving && (
            <div className="mt-4 text-center">
              <p className="text-sm text-gray-600">
                Aguarde enquanto salvamos os dados...
                <br />
                <span className="text-xs">Isso pode levar alguns segundos</span>
              </p>
            </div>
          )}
        </div>
      </form>

      {/* INSTRUÇÕES DE DEBUG */}
      <div className="mt-8 p-4 bg-gray-100 rounded-lg">
        <h3 className="font-semibold mb-2">🐛 Se ainda estiver travando:</h3>
        <ol className="list-decimal pl-5 space-y-1 text-sm text-gray-700">
          <li>Abra o Console do Navegador (F12)</li>
          <li>Clique no botão "Testar Conexão" acima</li>
          <li>Verifique se há erros vermelhos no console</li>
          <li>Compartilhe os erros com o desenvolvedor</li>
        </ol>
        <button
          onClick={() => {
            console.clear();
            console.log("=== DEBUG LOG ===");
            console.log("Appointment:", appointment);
            console.log("Client:", client);
            console.log("Location:", location);
            console.log("Parameters:", parameters);
            console.log("Firestore:", db);
            console.log("Storage:", storage);
          }}
          className="mt-2 px-3 py-1 text-xs bg-gray-600 text-white rounded"
        >
          Log de Debug no Console
        </button>
      </div>
    </div>
  );
}
```