"use client";

import React, { useState, useRef } from "react";
import { useFormState, useFormStatus } from "react-dom";
import Image from "next/image";
import { analyzeReportAction, AnalyzeReportState } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CheckCircle, AlertTriangle, Info, UploadCloud, X } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending ? <><Spinner size="small" className="mr-2"/> Analisando...</> : "Analisar e Enviar Relatório"}
    </Button>
  );
}

export function ReportForm() {
  const initialState: AnalyzeReportState = {};
  const [state, formAction] = useFormState(analyzeReportAction, initialState);
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const clearPreview = () => {
    setPreview(null);
    if(fileInputRef.current) {
        fileInputRef.current.value = "";
    }
  }

  const AnalysisResult = ({ status, title, description, icon: Icon }: { status: string, title: string, description: string, icon: React.ElementType }) => (
    <Card className={`border-${status}-500`}>
        <CardHeader className="flex flex-row items-center gap-3 space-y-0">
            <Icon className={`h-6 w-6 text-${status}-500`} />
            <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
            <p>{description}</p>
        </CardContent>
    </Card>
  )

  return (
    <form action={formAction}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Card>
          <CardHeader>
            <CardTitle>Detalhes do Serviço</CardTitle>
            <CardDescription>Preencha os campos abaixo com os dados coletados.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="poolParameters">Parâmetros da Piscina</Label>
              <Textarea
                id="poolParameters"
                name="poolParameters"
                placeholder="Ex: Cloro: 2.5 ppm, pH: 7.4, Alcalinidade: 100 ppm"
                required
                rows={4}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="servicesPerformed">Serviços Realizados</Label>
              <Textarea
                id="servicesPerformed"
                name="servicesPerformed"
                placeholder="Ex: Aspiração do fundo, Limpeza das bordas, Aplicação de clarificante"
                required
                rows={4}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="photo">Foto da Piscina</Label>
              {preview ? (
                <div className="relative">
                    <Image src={preview} alt="Pré-visualização da piscina" width={600} height={400} className="rounded-md object-cover aspect-video w-full" />
                    <Button type="button" size="icon" variant="destructive" className="absolute top-2 right-2 h-7 w-7" onClick={clearPreview}>
                        <X size={16}/>
                    </Button>
                </div>
              ) : (
                <div className="flex items-center justify-center w-full">
                    <Label htmlFor="photo" className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-lg cursor-pointer bg-card hover:bg-accent">
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                            <UploadCloud className="w-10 h-10 mb-3 text-muted-foreground" />
                            <p className="mb-2 text-sm text-muted-foreground"><span className="font-semibold">Clique para enviar</span> ou arraste e solte</p>
                            <p className="text-xs text-muted-foreground">PNG, JPG, ou WEBP</p>
                        </div>
                        <Input id="photo" name="photo" type="file" className="hidden" accept="image/png, image/jpeg, image/webp" onChange={handleFileChange} ref={fileInputRef} required />
                    </Label>
                </div> 
              )}
            </div>
          </CardContent>
          <CardFooter>
            <SubmitButton />
          </CardFooter>
        </Card>

        <Card className="flex flex-col">
            <CardHeader>
                <CardTitle>Análise da IA</CardTitle>
                <CardDescription>O resultado da análise da foto e dos dados aparecerá aqui.</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col justify-center space-y-4">
                {useFormStatus().pending && (
                     <div className="flex flex-col items-center justify-center text-center text-muted-foreground h-full">
                        <Spinner size="large" />
                        <p className="mt-4 font-medium">Analisando o relatório...</p>
                        <p className="text-sm">Isso pode levar alguns segundos.</p>
                    </div>
                )}
                {state.error && (
                    <Alert variant="destructive">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle>Erro na Análise</AlertTitle>
                        <AlertDescription>{state.error}</AlertDescription>
                    </Alert>
                )}
                {state.analysisResult && (
                    <div className="space-y-4">
                       <AnalysisResult status="green" title="Análise Geral" description={state.analysisResult.analysisResult} icon={Info} />
                       <AnalysisResult status="yellow" title="Problemas Identificados" description={state.analysisResult.issuesIdentified} icon={AlertTriangle} />
                       <AnalysisResult status="blue" title="Status de Conformidade" description={state.analysisResult.complianceStatus} icon={CheckCircle} />
                    </div>
                )}
                {!useFormStatus().pending && !state.analysisResult && !state.error && (
                    <div className="flex flex-col items-center justify-center text-center text-muted-foreground h-full">
                        <Info className="h-12 w-12" />
                        <p className="mt-4 font-medium">Aguardando envio do relatório</p>
                    </div>
                )}
            </CardContent>
        </Card>
      </div>
    </form>
  );
}
