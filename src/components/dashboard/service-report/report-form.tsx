
"use client";

import React, { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { useFormState, useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { UploadCloud, X, CheckCircle } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import type { Client, Appointment } from "@/lib/types";
import { submitReportAction, type SubmitReportState } from "@/app/actions";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const waterParameters = [
  { name: "Cloro", key: "chlorine", min: 0, max: 5, step: 0.1, defaultValue: 2.5 },
  { name: "Alcalinidade", key: "alkalinity", min: 0, max: 200, step: 10, defaultValue: 100 },
  { name: "pH", key: "ph", min: 6, max: 9, step: 0.1, defaultValue: 7.4 },
  { name: "CYA", key: "cya", min: 0, max: 100, step: 5, defaultValue: 30 },
  { name: "Dureza Cálcica", key: "calciumHardness", min: 0, max: 500, step: 10, defaultValue: 250 },
  { name: "ORP", key: "orp", min: 0, max: 1000, step: 10, defaultValue: 650 },
  { name: "TDS", key: "tds", min: 0, max: 3000, step: 100, defaultValue: 1500 },
  { name: "Temperatura", key: "temperature", min: 0, max: 40, step: 1, defaultValue: 25 },
];

const servicesPerformedItems = [
    { id: "asp_filtrando", label: "Aspiração filtrando" },
    { id: "asp_drenando", label: "Aspiração drenando" },
    { id: "escovacao", label: "Escovação" },
    { id: "peneiracao", label: "Peneiração" },
    { id: "limpeza_bordas", label: "Limpeza de bordas" },
    { id: "limpeza_pre_filtro", label: "Limpeza pré-filtro" },
    { id: "retrolavagem_filtro", label: "Retrolavagem do elemento filtrante" },
    { id: "lavagem_filtro_poliester", label: "Lavagem filtro poliéster (Sistema Drypomp IGUI)" },
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


function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending ? <><Spinner size="small" className="mr-2"/> Finalizando...</> : "Finalizar Relatório"}
    </Button>
  );
}

export function ServiceReportForm({ appointment, client }: { appointment: Appointment; client: Client }) {
  const { toast } = useToast();
  const router = useRouter();
  const [previews, setPreviews] = useState<(string | null)[]>([null, null, null, null]);
  const fileInputRefs = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)];
  
  const [parameters, setParameters] = useState<Record<string, number>>(() =>
    waterParameters.reduce((acc, p) => ({ ...acc, [p.key]: p.defaultValue }), {})
  );

  const initialState: SubmitReportState = { success: false, error: undefined };
  const [state, formAction] = useFormState(submitReportAction, initialState);

  useEffect(() => {
    if (state.success) {
      toast({
        title: "Relatório Finalizado!",
        description: "O relatório de serviço foi salvo e o cliente será notificado.",
        variant: 'default',
      });
      // Redirect to the schedule page after successful submission
      router.push('/dashboard/schedule');
    }
    if (state.error) {
      toast({
        title: "Erro ao Finalizar",
        description: state.error,
        variant: "destructive",
      });
    }
  }, [state, toast, router]);

  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const newPreviews = [...previews];
        newPreviews[index] = reader.result as string;
        setPreviews(newPreviews);
      };
      reader.readAsDataURL(file);
    }
  };

  const clearPreview = (index: number) => {
    const newPreviews = [...previews];
    newPreviews[index] = null;
    setPreviews(newPreviews);
    if(fileInputRefs[index].current) {
        fileInputRefs[index].current.value = "";
    }
  }
  
  const handleParameterChange = (key: string, value: number[]) => {
      setParameters(prev => ({ ...prev, [key]: value[0] }));
  }

  if (state.success) {
    return (
        <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertTitle>Relatório Enviado com Sucesso!</AlertTitle>
            <AlertDescription>
                O cliente foi notificado. Você será redirecionado para a agenda.
            </AlertDescription>
        </Alert>
    )
  }

  return (
    <form action={formAction}>
       {/* Hidden fields to pass essential IDs */}
      <input type="hidden" name="appointmentId" value={appointment.id} />
      <input type="hidden" name="franchiseId" value={appointment.franchiseId} />
      <input type="hidden" name="clientId" value={client.id} />
      <input type="hidden" name="technicianId" value={appointment.technicianId} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Parâmetros da Água</CardTitle>
                    <CardDescription>Ajuste os sliders para os valores medidos.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 pt-4">
                    {waterParameters.map(param => (
                        <div key={param.key} className="grid gap-2">
                            <div className="flex justify-between">
                                <Label htmlFor={param.key}>{param.name}</Label>
                                <span className="text-sm font-medium text-muted-foreground">{parameters[param.key]}</span>
                            </div>
                            <Slider
                                name={param.key}
                                min={param.min}
                                max={param.max}
                                step={param.step}
                                value={[parameters[param.key]]}
                                onValueChange={(value) => handleParameterChange(param.key, value)}
                            />
                        </div>
                    ))}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Upload de Fotos</CardTitle>
                    <CardDescription>Anexe até 4 fotos do serviço.</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4">
                    {[0, 1, 2, 3].map(index => (
                        <div key={index} className="space-y-2">
                          <Label htmlFor={`photo-${index}`}>Foto {index + 1}</Label>
                          {previews[index] ? (
                            <div className="relative">
                                <Image src={previews[index] as string} alt={`Preview ${index+1}`} width={300} height={400} className="rounded-md object-cover aspect-[3/4] w-full" />
                                <Button type="button" size="icon" variant="destructive" className="absolute top-2 right-2 h-6 w-6" onClick={() => clearPreview(index)}>
                                    <X size={14}/>
                                </Button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-center w-full">
                                <Label htmlFor={`photo-${index}`} className="flex flex-col items-center justify-center w-full aspect-[3/4] border-2 border-dashed rounded-lg cursor-pointer bg-card hover:bg-accent">
                                    <div className="flex flex-col items-center justify-center text-center p-2">
                                        <UploadCloud className="w-8 h-8 mb-2 text-muted-foreground" />
                                        <p className="text-xs text-muted-foreground">Clique para enviar</p>
                                    </div>
                                    <Input id={`photo-${index}`} name={`photo-${index}`} type="file" className="hidden" accept="image/png, image/jpeg, image/webp" onChange={(e) => handleFileChange(e, index)} ref={fileInputRefs[index]} />
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
                <CardContent className="grid grid-cols-2 gap-4">
                    {servicesPerformedItems.map(item => (
                        <div key={item.id} className="flex items-center space-x-2">
                            <Checkbox id={`service-${item.id}`} name="servicesPerformed" value={item.label} />
                            <Label htmlFor={`service-${item.id}`} className="font-normal text-sm">{item.label}</Label>
                        </div>
                    ))}
                </CardContent>
            </Card>

             <Card>
                <CardHeader>
                    <CardTitle>Produtos Faltantes</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4">
                    {missingProductsItems.map(item => (
                        <div key={item.id} className="flex items-center space-x-2">
                             <Checkbox id={`product-${item.id}`} name="missingProducts" value={item.label} />
                            <Label htmlFor={`product-${item.id}`} className="font-normal text-sm">{item.label}</Label>
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
                    />
                </CardContent>
            </Card>
            
            <SubmitButton />
        </div>
      </div>
    </form>
  );
}
