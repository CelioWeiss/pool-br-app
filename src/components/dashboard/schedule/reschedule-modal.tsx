
"use client";

import { useState } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { useFirestore, errorEmitter, FirestorePermissionError } from "@/firebase";
import type { Appointment } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { useToast } from "@/hooks/use-toast";
import { Spinner } from "@/components/ui/spinner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { set } from "date-fns";
import { ptBR } from "date-fns/locale";

interface RescheduleModalProps {
  appointment: Appointment;
  onClose: () => void;
}

export function RescheduleModal({ appointment, onClose }: RescheduleModalProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [newDate, setNewDate] = useState<Date | undefined>(new Date(appointment.scheduledDateTime));
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!firestore || !newDate || !appointment.franchiseId || !appointment.id) {
        toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível reagendar.' });
        return;
    }
    
    setIsSaving(true);
    
    const originalDate = new Date(appointment.scheduledDateTime);
    const newDateTime = set(newDate, {
        hours: originalDate.getHours(),
        minutes: originalDate.getMinutes(),
        seconds: originalDate.getSeconds(),
    }).toISOString();

    const appointmentRef = doc(firestore, `franchises/${appointment.franchiseId}/appointments`, appointment.id);

    try {
        await updateDoc(appointmentRef, { scheduledDateTime: newDateTime });
        toast({
            title: "Reagendado!",
            description: `O atendimento foi reagendado para a nova data.`
        });
        onClose();
    } catch (error) {
        console.error("Error rescheduling appointment:", error);
        const permissionError = new FirestorePermissionError({
            path: appointmentRef.path,
            operation: 'update',
            requestResourceData: { scheduledDateTime: newDateTime },
        });
        errorEmitter.emit('permission-error', permissionError);
        toast({
            variant: 'destructive',
            title: 'Erro ao reagendar',
            description: 'Você não tem permissão para alterar este agendamento.'
        });
    } finally {
        setIsSaving(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reagendar Atendimento</DialogTitle>
          <DialogDescription>
            Selecione a nova data para o atendimento. O horário será mantido.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 flex justify-center">
            <Calendar
                mode="single"
                selected={newDate}
                onSelect={setNewDate}
                disabled={(date) => date < new Date(new Date().setDate(new Date().getDate() - 1))}
                locale={ptBR}
            />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSaving}>Cancelar</Button>
          <Button onClick={handleSave} disabled={!newDate || isSaving}>
            {isSaving ? <><Spinner size="small" className="mr-2" /> Salvando...</> : "Salvar Nova Data"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
