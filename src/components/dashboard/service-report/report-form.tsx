"use client";

import React, { useEffect, useMemo, useCallback, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";

import { UploadCloud, X, CheckCircle, WifiOff, RefreshCw, AlertTriangle } from "lucide-react";

import type { Client, Appointment, ServiceReport, ServiceLocation, Technician } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";

import { useFirestore, useStorage, useDoc } from "@/firebase";
import { writeBatch, doc, collection } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { v4 as uuidv4 } from "uuid";

/** =========================
 *  CONSTANTES
 *  ========================= */
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

/** =========================
 *  OFFLINE QUEUE (localStorage)
 *  ========================= */
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

  // fotos (dataURLs) — para enviar depois quando voltar a internet
  photoDataUrls: string[];
  serviceReportId?: string;
};

const OFFLINE_QUEUE_KEY = "pool_service_reports_pending_v1";

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

/** =========================
 *  IMAGE HELPERS (mobile friendly)
 *  ========================= */
async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Falha ao ler a imagem"));
    reader.readAsDataURL(file);
  });
}

async function compressDataUrl(dataUrl: string, maxSide = 1400, quality = 0.7): Promise<string> {
  if (!dataUrl.startsWith("data:image")) return dataUrl;

  const img = document.createElement("img");
  img.src = dataUrl;

  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("Falha ao carregar imagem para compressão"));
  });

  const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
  const w = Math.max(1, Math.round(img.width * scale));
  const h = Math.max(1, Math.round(img.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;

  const ctx = canvas.getContext("2d");
  if (!ctx) return dataUrl;

  ctx.drawImage(img, 0, 0, w, h);
  return canvas.toDataURL("image/jpeg", quality);
}

/** =========================
 *  COMPONENTE PRINCIPAL
 *  ========================= */
export function ServiceReportForm({ appointmentId, franchiseId }: { appointmentId: string, franchiseId: string }) {
  const { toast } = useToast();
  const router = useRouter();
  const firestore = useFirestore();
  const storage = useStorage();

  const appointmentDocRef = useMemo(() =>
    doc(firestore, `franchises/${franchiseId}/appointments`, appointmentId)
  , [firestore, franchiseId, appointmentId]);

  const { data: appointment, isLoading: isLoadingAppointment } = useDoc<Appointment>(appointmentDocRef);

  const clientDocRef = useMemo(() => {
    if (!firestore || !franchiseId || !appointment?.clientId) return null;
    return doc(firestore, `franchises/${franchiseId}/clients`, appointment.clientId);
  }, [firestore, franchiseId, appointment?.clientId]);
  const { data: client, isLoading: isLoadingClient } = useDoc<Client>(clientDocRef);

  const locationDocRef = useMemo(() => {
    if (!firestore || !franchiseId || !appointment?.locationId) return null;
    return doc(firestore, `franchises/${franchiseId}/locations`, appointment.locationId);
  }, [firestore, franchiseId, appointment?.locationId]);
  const { data: location, isLoading: isLoadingLocation } = useDoc<ServiceLocation>(locationDocRef);

  const technicianDocRef = useMemo(() => {
    if (!firestore || !franchiseId || !appointment?.technicianId) return null;
    return doc(firestore, `franchises/${franchiseId}/technicians`, appointment.technicianId);
  }, [firestore, franchiseId, appointment?.technicianId]);
  const { data: technician, isLoading: isLoadingTechnician } = useDoc<Technician>(technicianDocRef);


  // UI / estado
  const [isSaving, setIsSaving] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isOnline, setIsOnline] = useState<boolean>(() => (typeof navigator !== "undefined" ? navigator.onLine : true));
  const [pendingCount, setPendingCount] = useState(0);

  // formulário
  const [previews, setPreviews] = useState<(string | null)[]>([null, null, null, null]);
  const [parameters, setParameters] = useState<Record<string, number>>(() =>
    Object.fromEntries(waterParameters.map((p) => [p.key, p.defaultValue])) as Record<string, number>
  );
  const [servicesPerformed, setServicesPerformed] = useState<string[]>([]);
  const [missingProducts, setMissingProducts] = useState<string[]>([]);
  const [observations, setObservations] = useState("");

  // edição (quando já existe serviceReportId)
  const reportDocRef = useMemo(() => {
    if (!firestore || !franchiseId || !appointment?.serviceReportId) return null;
    return doc(firestore, `franchises/${franchiseId}/serviceReports`, appointment.serviceReportId);
  }, [firestore, franchiseId, appointment?.serviceReportId]);

  const { data: existingReport } = useDoc<ServiceReport>(reportDocRef);

  useEffect(() => {
    if (!existingReport) return;

    const paramKeys = waterParameters.map((p) => p.key);
    const loaded: Record<string, number> = {};
    for (const key of paramKeys) {
      loaded[key] = (existingReport as any)[key] ?? waterParameters.find((p) => p.key === key)?.defaultValue ?? 0;
    }
    setParameters(loaded);

    setServicesPerformed(existingReport.servicesPerformed || []);
    setMissingProducts(existingReport.missingProducts || []);
    setObservations(existingReport.observations || "");

    const urls = (existingReport.photoUrls || []).slice(0, 4);
    setPreviews([urls[0] ?? null, urls[1] ?? null, urls[2] ?? null, urls[3] ?? null]);
  }, [existingReport]);

  /** ---------- envio ONLINE (Storage + Firestore) ---------- */
  const sendReportOnline = useCallback(async (pending: PendingReport) => {
    if (!firestore || !storage) throw new Error("Firebase indisponível no momento.");

    // 1) upload das fotos (se houver)
    const photoUrls: string[] = [];
    for (const dataUrl of pending.photoDataUrls) {
        if (!dataUrl) continue;
        
        // If it's already an HTTP URL, it's already uploaded.
        if (dataUrl.startsWith("http")) {
            photoUrls.push(dataUrl);
            continue;
        }

        const [header, base64] = dataUrl.split(",");
        const mime = header?.match(/:(.*?);/)?.[1] || "image/jpeg";
        const binary = atob(base64 || "");
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

        const blob = new Blob([bytes], { type: mime });
        const path = `service-reports/${pending.franchiseId}/${pending.appointmentId}/${uuidv4()}`;
        const storageRef = ref(storage, path);

        const snap = await uploadBytes(storageRef, blob);
        const url = await getDownloadURL(snap.ref);
        photoUrls.push(url);
    }

    // 2) monta doc do relatório
    const reportRef = pending.serviceReportId
      ? doc(firestore, `franchises/${pending.franchiseId}/serviceReports`, pending.serviceReportId)
      : doc(collection(firestore, `franchises/${pending.franchiseId}/serviceReports`));

    const reportData: Omit<ServiceReport, "id"> & { id: string } = {
      id: reportRef.id,
      franchiseId: pending.franchiseId,
      appointmentId: pending.appointmentId,
      technicianId: pending.technicianId,
      clientId: pending.clientId,
      locationId: pending.locationId,
      ...pending.parameters,
      servicesPerformed: pending.servicesPerformed,
      missingProducts: pending.missingProducts,
      observations: pending.observations,
      photoUrls,
      createdAt: pending.createdAt,
    };

    // 3) batch (relatório + update do agendamento)
    const batch = writeBatch(firestore);
    batch.set(reportRef, reportData, { merge: true });

    const appointmentRef = doc(firestore, "franchises", pending.franchiseId, "appointments", pending.appointmentId);
    batch.update(appointmentRef, { serviceReportId: reportRef.id, status: "completed" });

    await batch.commit();
  }, [firestore, storage]);

  /** ---------- sincronização (fila) ---------- */
  const syncPendingReports = useCallback(async () => {
    if (!firestore || !storage || typeof window === "undefined" || !navigator.onLine) return;
    
    let isSyncing = false; // Simple lock
    if (isSyncing) return;
    isSyncing = true;

    setIsSaving(true);
    try {
        while (true) {
            const queue = readQueue();
            if (queue.length === 0) break;
            
            const pending = queue[0];
            try {
                await sendReportOnline(pending);
                removePending(pending.id);
            } catch (err) {
                console.error("Failed to sync a pending report, will retry later:", err);
                // Stop on first error to avoid repeated failures in a bad network state
                break;
            }
        }

        const remainingCount = readQueue().length;
        if (remainingCount === 0) {
            toast({ title: "Sincronização concluída", description: "Todos os relatórios pendentes foram enviados." });
        }
        setPendingCount(remainingCount);

    } catch (err: any) {
      setPendingCount(readQueue().length);
      toast({
        variant: "destructive",
        title: "Sincronização não concluída",
        description: err?.message || "Alguns relatórios permanecem salvos no celular e serão reenviados automaticamente.",
      });
    } finally {
      setIsSaving(false);
      isSyncing = false;
    }
  }, [firestore, storage, toast, sendReportOnline]);

  // online/offline + pending count
  useEffect(() => {
    if (typeof window === "undefined") return;

    const update = () => setPendingCount(readQueue().length);

    const onOnline = () => {
      setIsOnline(true);
      update();
      void syncPendingReports(); // tenta enviar ao voltar
    };
    const onOffline = () => {
      setIsOnline(false);
      update();
    };

    update();
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);

    // tentativa inicial (se já estiver online ao abrir)
    if (navigator.onLine) void syncPendingReports();

    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [syncPendingReports]);

  /** ---------- helpers de UI ---------- */
  const handleParameterChange = (key: string, value: number[]) => {
    setParameters((prev) => ({ ...prev, [key]: value[0] }));
  };

  const handleCheckboxChange = (
    setter: React.Dispatch<React.SetStateAction<string[]>>,
    value: string,
    checked: boolean
  ) => {
    setter((prev) => (checked ? [...prev, value] : prev.filter((x) => x !== value)));
  };

  const clearPreview = (index: number) => {
    setPreviews((prev) => {
      const next = [...prev];
      next[index] = null;
      return next;
    });
    const input = document.getElementById(`photo-${index}`) as HTMLInputElement | null;
    if (input) input.value = "";
  };

  /** ---------- fotos (mobile) ---------- */
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // limite mais seguro para celular e para localStorage
    if (file.size > 5 * 1024 * 1024) {
      toast({ variant: "destructive", title: "Arquivo muito grande", description: "Escolha uma foto com até 5MB." });
      return;
    }

    try {
      const raw = await fileToDataUrl(file);
      const compressed = await compressDataUrl(raw, 1400, 0.68);

      // validação de “tamanho” do dataURL (evita estourar storage local)
      if (compressed.length > 1_800_000) {
        toast({
          variant: "destructive",
          title: "Foto ainda está pesada",
          description: "Tire mais perto (ou com menos resolução) para reduzir o tamanho.",
        });
        return;
      }

      setPreviews((prev) => {
        const next = [...prev];
        next[index] = compressed;
        return next;
      });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Falha ao processar imagem", description: err?.message || "Tente outra foto." });
    }
  };

  /** ---------- submit (online -> envia, offline -> fila) ---------- */
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!appointment || !technician) return;

    const { clientId, locationId } = appointment;
    const appointmentIdSafe = appointmentId;


    const newPhotoDataUrls = (previews.filter(p => p && p.startsWith('data:image')) as string[]);
    const existingPhotoUrls = (previews.filter(p => p && p.startsWith('http')) as string[]);

    const allPhotoUrls = [...existingPhotoUrls, ...newPhotoDataUrls];


    const pending: PendingReport = {
      id: uuidv4(),
      createdAt: existingReport?.createdAt || new Date().toISOString(),
      franchiseId,
      appointmentId: appointmentIdSafe,
      clientId,
      locationId,
      technicianId: technician.id,
      parameters,
      servicesPerformed,
      missingProducts,
      observations,
      photoDataUrls: allPhotoUrls,
      serviceReportId: appointment.serviceReportId,
    };

    // se estiver claramente offline -> só fila
    if (!navigator.onLine || !firestore || !storage) {
      enqueuePending(pending);
      setPendingCount(readQueue().length);
      setIsSuccess(true);
      toast({
        title: "Relatório salvo no celular (offline)",
        description: "Assim que o sinal voltar, o envio é feito automaticamente.",
      });
      return;
    }

    // tenta enviar online; se der erro de rede/permissão, cai para fila (não perde dados)
    setIsSaving(true);
    try {
      await sendReportOnline(pending);
      setIsSuccess(true);
      toast({ title: "Relatório enviado!", description: "O relatório foi registrado com sucesso." });
      setTimeout(() => router.push("/dashboard/schedule"), 1200);
    } catch (err: any) {
      enqueuePending(pending);
      setPendingCount(readQueue().length);
      setIsSuccess(true);
      toast({
        variant: "destructive",
        title: "Envio não concluído agora",
        description: "O relatório foi salvo no celular e será enviado automaticamente quando voltar a internet.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  /** ---------- render ---------- */
  const isLoading = isLoadingAppointment || isLoadingClient || isLoadingLocation || isLoadingTechnician;

  if (isLoading) {
    return (
        <div className="flex h-[80vh] items-center justify-center">
          <Spinner size="large" />
          <p className="ml-4">Carregando dados do atendimento...</p>
        </div>
    );
  }

  if (!appointment || !client || !location || !technician) {
      return (
            <div className="flex h-[80vh] items-center justify-center">
            <Card className="max-w-md text-center">
                <CardHeader>
                    <CardTitle className="flex items-center justify-center gap-2"><AlertTriangle className="text-destructive"/> Atendimento Não Encontrado</CardTitle>
                </CardHeader>
                <CardContent>
                    <p>Não foi possível carregar os dados completos do atendimento. Verifique o ID e tente novamente.</p>
                </CardContent>
            </Card>
            </div>
      )
  }

  if (isSuccess) {
    return (
      <div className="space-y-6">
        <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight">Relatório de Atendimento</h1>
            <p className="text-muted-foreground text-lg">Cliente: <span className="font-semibold">{client.name}</span></p>
            <p className="text-muted-foreground">Endereço: <span className="font-semibold">{location.address}</span></p>
        </div>
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertTitle>Pronto!</AlertTitle>
          <AlertDescription>
            {isOnline ? (
              <>Relatório {pendingCount > 0 ? "pendente para sincronizar" : "enviado"} com sucesso.</>
            ) : (
              <>Você está offline — o relatório foi guardado no celular e será enviado quando voltar o sinal.</>
            )}
            <Button onClick={() => router.push("/dashboard/schedule")} className="mt-4 w-full">
              Voltar para a Agenda
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-1 mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Relatório de Atendimento</h1>
        <p className="text-muted-foreground text-lg">Cliente: <span className="font-semibold">{client.name}</span></p>
        <p className="text-muted-foreground">Endereço: <span className="font-semibold">{location.address}</span></p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {!isOnline && (
          <Alert variant="destructive">
            <WifiOff className="h-4 w-4" />
            <AlertTitle>Modo offline</AlertTitle>
            <AlertDescription>
              Sem internet agora: ao finalizar, o relatório fica salvo no celular e será enviado automaticamente quando o
              sinal voltar.
            </AlertDescription>
          </Alert>
        )}

        {pendingCount > 0 && (
          <Alert>
            <AlertTitle>Relatórios pendentes</AlertTitle>
            <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <span>Você tem <b>{pendingCount}</b> relatório(s) aguardando sincronização.</span>
              <Button type="button" onClick={() => void syncPendingReports()} disabled={isSaving || !isOnline}>
                <RefreshCw className="mr-2 h-4 w-4" /> Sincronizar agora
              </Button>
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Parâmetros da Água</CardTitle>
                <CardDescription>Ajuste os valores medidos.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5 pt-2">
                {waterParameters.map((param) => (
                  <div key={param.key} className="grid gap-2">
                    <div className="flex justify-between items-center">
                      <Label htmlFor={param.key}>{param.name}</Label>
                      <span className="text-sm font-medium text-muted-foreground">
                        {parameters[param.key]} {param.unit}
                      </span>
                    </div>
                    <Slider
                      name={param.key}
                      min={param.min}
                      max={param.max}
                      step={param.step}
                      value={[parameters[param.key]]}
                      onValueChange={(v) => handleParameterChange(param.key, v)}
                      disabled={isSaving}
                      style={{ touchAction: "none" }}
                    />
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Fotos do Serviço</CardTitle>
                <CardDescription>Até 4 fotos (recomendado: bem perto da área tratada).</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                {[0, 1, 2, 3].map((index) => (
                  <div key={index} className="space-y-2">
                    <Label htmlFor={`photo-${index}`} className="sr-only">
                      Foto {index + 1}
                    </Label>

                    {previews[index] ? (
                      <div className="relative">
                        <Image
                          src={previews[index] as string}
                          alt={`Foto ${index + 1}`}
                          width={320}
                          height={420}
                          className="rounded-md object-cover aspect-[3/4] w-full"
                        />
                        <Button
                          type="button"
                          size="icon"
                          variant="destructive"
                          className="absolute top-2 right-2 h-6 w-6"
                          onClick={() => clearPreview(index)}
                          disabled={isSaving}
                        >
                          <X size={14} />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center w-full">
                        <Label
                          htmlFor={`photo-${index}`}
                          className="flex flex-col items-center justify-center w-full aspect-[3/4] border-2 border-dashed rounded-lg cursor-pointer bg-card hover:bg-accent"
                        >
                          <div className="flex flex-col items-center justify-center text-center p-2">
                            <UploadCloud className="w-8 h-8 mb-2 text-muted-foreground" />
                            <p className="text-xs text-muted-foreground">Tocar para foto</p>
                          </div>
                          <Input
                            id={`photo-${index}`}
                            name={`photo-${index}`}
                            type="file"
                            className="hidden"
                            accept="image/png, image/jpeg, image/webp"
                            capture="environment"
                            onChange={(e) => void handleFileChange(e, index)}
                            disabled={isSaving}
                          />
                        </Label>
                      </div>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Serviços Realizados</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {servicesPerformedItems.map((item) => (
                  <div key={item.id} className="flex items-center gap-2">
                    <Checkbox
                      id={`service-${item.id}`}
                      checked={servicesPerformed.includes(item.label)}
                      onCheckedChange={(checked) => handleCheckboxChange(setServicesPerformed, item.label, Boolean(checked))}
                      disabled={isSaving}
                    />
                    <Label htmlFor={`service-${item.id}`} className="font-normal text-sm">
                      {item.label}
                    </Label>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Produtos Faltantes</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {missingProductsItems.map((item) => (
                  <div key={item.id} className="flex items-center gap-2">
                    <Checkbox
                      id={`product-${item.id}`}
                      checked={missingProducts.includes(item.label)}
                      onCheckedChange={(checked) => handleCheckboxChange(setMissingProducts, item.label, Boolean(checked))}
                      disabled={isSaving}
                    />
                    <Label htmlFor={`product-${item.id}`} className="font-normal text-sm">
                      {item.label}
                    </Label>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Observações</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  id="observations"
                  name="observations"
                  placeholder="Alguma observação importante sobre o serviço ou a piscina..."
                  rows={4}
                  value={observations}
                  onChange={(e) => setObservations(e.target.value)}
                  disabled={isSaving}
                />
              </CardContent>
            </Card>

            <Button type="submit" disabled={isSaving} className="w-full" size="lg">
              {isSaving ? (
                <>
                  <Spinner size="small" className="mr-2" /> Enviando...
                </>
              ) : (
                "Finalizar Relatório"
              )}
            </Button>
          </div>
        </div>
      </form>
    </>
  );
}