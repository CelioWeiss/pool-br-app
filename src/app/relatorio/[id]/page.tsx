
"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { useFirestore } from "@/firebase";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

export default function RelatorioPage() {
  const params = useParams();
  const router = useRouter();
  const firestore = useFirestore();

  const id = Array.isArray(params.id) ? params.id[0] : params.id;

  const [agua, setAgua] = useState({
    cloro: 2.5,
    ph: 7.4,
    alcalinidade: 100,
    cya: 30,
    dureza: 250,
    orp: 650,
    tds: 1500,
    temperatura: 25,
  });

  const [servicos, setServicos] = useState<string[]>([]);
  const [produtos, setProdutos] = useState<string[]>([]);
  const [observacao, setObservacao] = useState("");
  const [fotos, setFotos] = useState<File[]>([]);

  function toggleItem(item: string, lista: string[], setLista: React.Dispatch<React.SetStateAction<string[]>>) {
    setLista(
      lista.includes(item)
        ? lista.filter(i => i !== item)
        : [...lista, item]
    );
  }

  async function finalizarRelatorio() {
    if (!firestore) {
        console.error("Firestore not initialized");
        return;
    }
    
    // TODO: Adicionar upload de fotos para o Firebase Storage
    
    await addDoc(collection(firestore, "relatorios"), {
      chamadoId: id,
      agua,
      servicos,
      produtos,
      observacao,
      criadoEm: serverTimestamp(),
      status: "finalizado"
    });

    await fetch("/api/notificacao-cliente", {
      method: "POST",
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ chamadoId: id })
    });

    // TODO: O ideal seria ter uma página de portal para o cliente
    // e redirecionar para lá. Por enquanto, voltamos para a agenda.
    router.push(`/dashboard/schedule`);
  }
  
  const servicosItems = [
      "Aspiração Drenando",
      "Aspiração Filtrando",
      "Peneiração",
      "Escovação",
      "Limpa Bordas",
      "Pré-Filtro",
      "Retrolavagem",
      "Lavagem Filtro Poliéster",
  ];
  
  const produtosItems = [
      "Cloro",
      "Elevador de pH",
      "Elevador de Alcalinidade",
      "Clarificante",
      "Gel Clarificante",
      "Pastilha de Cloro",
      "Ácido Clorídrico",
      "Sequestrante de Metais",
      "Algicida",
      "Oxidante",
      "Eliminador de Oleosidade",
      "Limpa Bordas",
  ];
  
  const aguaItems = [
      { key: "cloro", label: "Cloro", min: 0, max: 5, step: 0.1, unit: "ppm" },
      { key: "ph", label: "pH", min: 6, max: 9, step: 0.1, unit: "" },
      { key: "alcalinidade", label: "Alcalinidade", min: 0, max: 200, step: 10, unit: "ppm" },
      { key: "cya", label: "CYA", min: 0, max: 100, step: 5, unit: "ppm" },
      { key: "dureza", label: "Dureza Cálcica", min: 0, max: 500, step: 10, unit: "ppm" },
      { key: "orp", label: "ORP", min: 0, max: 1000, step: 10, unit: "mV" },
      { key: "tds", label: "TDS", min: 0, max: 3000, step: 100, unit: "ppm" },
      { key: "temperatura", label: "Temperatura", min: 0, max: 40, step: 1, unit: "°C" },
  ] as const;


  return (
    <div className="p-4 space-y-6 max-w-4xl mx-auto">

      <h1 className="text-2xl font-bold tracking-tight">Relatório de Atendimento</h1>

        <Card>
            <CardHeader><CardTitle>Parâmetros da Água</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 {aguaItems.map((item) => (
                    <div key={item.key}>
                      <div className="flex justify-between items-center mb-1">
                          <Label htmlFor={item.key} className="capitalize">{item.label}</Label>
                           <span className="text-sm font-medium text-muted-foreground">{agua[item.key]} {item.unit}</span>
                      </div>
                      <Input
                        id={item.key}
                        type="range"
                        min={item.min}
                        max={item.max}
                        step={item.step}
                        value={agua[item.key]}
                        onChange={(e) =>
                          setAgua({ ...agua, [item.key]: Number(e.target.value) })
                        }
                        className="w-full"
                      />
                    </div>
                ))}
            </CardContent>
        </Card>

        <Card>
            <CardHeader><CardTitle>Serviços Realizados</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {servicosItems.map((item) => (
                  <div key={item} className="flex items-center space-x-2">
                    <Checkbox
                      id={`servico-${item}`}
                      onCheckedChange={() => toggleItem(item, servicos, setServicos)}
                    /> 
                    <Label htmlFor={`servico-${item}`} className="font-normal">{item}</Label>
                  </div>
                ))}
            </CardContent>
        </Card>
        
        <Card>
            <CardHeader><CardTitle>Produtos Faltantes</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {produtosItems.map((item) => (
                  <div key={item} className="flex items-center space-x-2">
                    <Checkbox
                      id={`produto-${item}`}
                      onCheckedChange={() => toggleItem(item, produtos, setProdutos)}
                    />
                    <Label htmlFor={`produto-${item}`} className="font-normal">{item}</Label>
                  </div>
                ))}
            </CardContent>
        </Card>

        <Card>
            <CardHeader><CardTitle>Fotos (até 4)</CardTitle></CardHeader>
            <CardContent>
                <Input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={(e) => setFotos(Array.from(e.target.files || []).slice(0, 4))}
                />
                <div className="mt-4 grid grid-cols-4 gap-4">
                    {fotos.map((file, index) => (
                        <img key={index} src={URL.createObjectURL(file)} alt={`preview ${index}`} className="rounded-md object-cover aspect-video"/>
                    ))}
                </div>
            </CardContent>
        </Card>
      
        <Card>
            <CardHeader><CardTitle>Observações</CardTitle></CardHeader>
            <CardContent>
                <Textarea
                  placeholder="Deixe aqui suas observações sobre o atendimento..."
                  value={observacao}
                  onChange={(e) => setObservacao(e.target.value)}
                />
            </CardContent>
        </Card>

      <Button
        onClick={finalizarRelatorio}
        className="w-full"
      >
        Finalizar Relatório
      </Button>

    </div>
  );
}
