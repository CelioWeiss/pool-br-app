
"use client";

import React, { useEffect, useMemo, useCallback, useRef, useState } from "react";
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

import { UploadCloud, X, CheckCircle, WifiOff } from "lucide-react";

import type { Client, Appointment, ServiceReport, ServiceLocation, Technician } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";

import { useFirestore, useStorage, useDoc } from "@/firebase";
import { writeBatch, doc, collection } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { v4 as uuidv4 } from "uuid";

/** =========================
 *  CONSTANTES (mesmo modelo do seu projeto)
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
  id: string; // id local para resolver reenvio
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

  // dataURLs (base64) para enviar depois
  photoDataUrls: string[];
  // se existir um serviceReportId já criado no backend (caso de edição)
  serviceReportId?: string;
};

const OFFLINE_QUEUE_KEY = "pool_service_reports_pending_v1";

/** Helpers simples (sem libs externas) */
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
  const q = readQueue().filter((x) => x.id !== id);
  writeQueue(q);
}

/** =========================
 *  IMAGE COMPRESSION (mobile-friendly)
 *  ========================= */
async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Falha ao ler a imagem"));
    reader.readAsDataURL(file);
  });
}

/** Resiza para evitar “foto pesada” no 4G e reduzir falhas */
async function compressDataUrl(dataUrl: string, maxSide = 1600, quality = 0.72): Promise<string> {
  // se não for imagem padrão, devolve o original
  if (!dataUrl.startsWith("data:image")) return dataUrl;

  const img = document.createElement("img");
  img.src = dataUrl;

  await new Promise((resolve, reject) => {
    img.onload = () => resolve(true);
    img.onerror = () => reject(new Error("Falha ao carregar imagem para compressão"));
  });

  const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
  const w = Math.round(img.width * scale);
  const h = Math.round(img.height * scale);

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
export function ServiceReportForm(props: {
  appointment: Appointment;
  client: Client;
  location: ServiceLocation;
  technician: Technician;
}) {
  const { appointment, client, location, technician } = props;

  const { toast } = useToast();
  const router = useRouter();
  const firestore = useFirestore();
  const storage = useStorage();

  // UI / estados
  const [isSaving, setIsSaving] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== "undefined" ? navigator.onLine : true);

  // dados do formulário
  const [previews, setPreviews] = useState<(string | null)[]>([null, null, null, null]);
  const [parameters, setParameters] = useState<Record<string, number>>(
    () => Object.fromEntries(waterParameters.map((p) => [p.key, p.defaultValue])) as Record<string, number>
  );
  const [servicesPerformed, setServicesPerformed] = useState<string[]>([]);
  const [missingProducts, setMissingProducts] = useState<string[]>([]);
  const [observations, setObservations] = useState("");

  // referência para edição (quando existir serviceReportId)
  const reportDocRef = useMemo(() => {
    if (!firestore || !appointment.franchiseId || !appointment.serviceReportId) return null;
    return doc(firestore, `franchises/${appointment.franchiseId}/serviceReports`, appointment.serviceReportId);
  }, [firestore, appointment]);

  const { data: existingReport } = useDoc<ServiceReport>(reportDocRef);

  /** --------- carregar relatório existente (quando houver) --------- */
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

  /** --------- monitorar conectividade e tentar sincronizar --------- */
  const trySyncPending = useCallback(async () => {
    if (!navigator.onLine) return;
    if (!firestore || !storage) return;

    const queue = readQueue();
    if (queue.length === 0) return;

    // tenta enviar um por um (mais robusto)
    for (const pending of queue) {
      try {
        // 1) subir fotos (dataURL -> upload)
        const photoUrls: string[] = [];
        for (const dataUrl of pending.photoDataUrls) {
          if (!dataUrl) continue;

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

        // 2) gravar no Firestore (report + update appointment)
        const reportRef = pending.serviceReportId
          ? doc(firestore, `franchises/${pending.franchiseId}/serviceReports/${pending.serviceReportId}`)
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

        const batch = writeBatch(firestore);
        batch.set(reportRef, reportData, { merge: true });

        const appointmentRef = doc(firestore, `franchises/${pending.franchiseId}/appointments`, pending.appointmentId);
        batch.update(appointmentRef, { serviceReportId: reportRef.id, status: "completed" });

        await batch.commit();

        // sucesso -> remove da fila
        removePending(pending.id);
      } catch (err) {
        console.error("Sync failed for a pending report:", err)
        // se falhar, mantém na fila e segue (tenta de novo na próxima reconexão)
      }
    }
  }, [firestore, storage]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const onOnline = () => {
      setIsOnline(true);
      // tenta sincronizar assim que voltar
      void trySyncPending();
    };
    const onOffline = () => setIsOnline(false);

    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);

    // tentativa inicial (caso o usuário abriu já online)
    void trySyncPending();

    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, [trySyncPending]);

  /** --------- helpers de UI --------- */
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

  /** --------- Fotos: mobile friendly (camera + compressão) --------- */
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // limite bem claro (evita erro e dá experiência melhor no 4G)
    if (file.size > 6 * 1024 * 1024) {
      toast({
        variant: "destructive",
        title: "Arquivo muito grande",
        description: "Escolha uma foto com até 6MB (ou tire uma mais próxima).",
      });
      return;
    }

    try {
      const raw = await fileToDataUrl(file);
      const compressed = await compressDataUrl(raw, 1600, 0.72);

      setPreviews((prev) => {
        const next = [...prev];
        next[index] = compressed;
        return next;
      });
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Não foi possível processar a imagem",
        description: err?.message || "Tente novamente com outra foto.",
      });
    }
  };

  /** --------- ENVIAR (online) ou ENFILEIRAR (offline) --------- */
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const { franchiseId, clientId, locationId, id: appointmentId } = appointment;

    const cleanPhotoData = previews.filter(Boolean) as string[];

    // monta o payload base (para online ou offline)
    const pending: PendingReport = {
      id: uuidv4(),
      createdAt: new Date().toISOString(),
      franchiseId,
      appointmentId,
      clientId,
      locationId,
      technicianId: technician.id,

      parameters,
      servicesPerformed,
      missingProducts,
      observations,
      photoDataUrls: cleanPhotoData,
      serviceReportId: appointment.serviceReportId,
    };

    // se estiver OFFLINE ou Firebase não estiver acessível -> salva localmente
    if (!navigator.onLine || !firestore || !storage) {
      enqueuePending(pending);

      toast({
        title: "Relatório salvo no seu celular (offline)",
        description:
          "Assim que o aparelho voltar a ter internet, o envio será feito automaticamente.",
      });

      setIsSuccess(true);
      return;
    }

    // se estiver ONLINE -> tenta enviar já (melhor experiência)
    setIsSaving(true);
    try {
      // envia imediatamente (reusa a mesma lógica do sync)
      enqueuePending(pending); // coloca na fila para garantir que não perca nada
      await trySyncPending();

      // se conseguiu enviar, o item some da fila (senão ele fica e será tentado depois)
      toast({
        title: "Relatório enviado!",
        description: "O relatório foi sincronizado com o painel/cliente.",
      });

      setIsSuccess(true);
      setTimeout(() => router.push("/dashboard/schedule"), 1200);
    } catch (err: any) {
      // em caso de falha (ex.: Storage com erro momentâneo) mantém na fila
      toast({
        variant: "destructive",
        title: "Não foi possível enviar agora",
        description: "Seu relatório ficou salvo no celular e será enviado assim que voltar a internet.",
      });
      setIsSuccess(true);
    } finally {
      setIsSaving(false);
    }
  };

  /** --------- Render --------- */
  if (isSuccess) {
    return (
      <div className="space-y-6">
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertTitle>Pronto!</AlertTitle>
          <AlertDescription>
            {isOnline ? (
              <>Relatório {navigator.onLine ? "sincronizado" : "salvo offline"} com sucesso.</>
            ) : (
              <>Você está offline — o relatório foi guardado no aparelho e será enviado quando o sinal voltar.</>
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
    <form onSubmit={handleSubmit} className="space-y-6">
      {!isOnline && (
        <Alert variant="destructive">
          <WifiOff className="h-4 w-4" />
          <AlertTitle>Modo offline</AlertTitle>
          <AlertDescription>
            Você está sem internet agora. Ao finalizar, o relatório será salvo no seu celular e enviado
            automaticamente quando o sinal voltar.
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
                    onCheckedChange={(checked) =>
                      handleCheckboxChange(setServicesPerformed, item.label, Boolean(checked))
                    }
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
                    onCheckedChange={(checked) =>
                      handleCheckboxChange(setMissingProducts, item.label, Boolean(checked))
                    }
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
  );
}

    