"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { setPatientId } from "@/lib/api-client";
import { useQueryClient } from "@tanstack/react-query";

interface PatientContextType {
  selectedPatientId: string | null;
  setSelectedPatientId: (id: string | null) => void;
  selectedPatientName: string | null;
  setSelectedPatientName: (name: string | null) => void;
}

const PatientContext = createContext<PatientContextType>({
  selectedPatientId: null,
  setSelectedPatientId: () => {},
  selectedPatientName: null,
  setSelectedPatientName: () => {},
});

export function PatientProvider({ children }: { children: React.ReactNode }) {
  const [selectedPatientId, setSelectedPatientIdState] = useState<string | null>(null);
  const [selectedPatientName, setSelectedPatientName] = useState<string | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    // Load from localStorage on mount
    const savedId = localStorage.getItem("medconnect_patient_id");
    const savedName = localStorage.getItem("medconnect_patient_name");
    
    if (savedId) {
      setSelectedPatientIdState(savedId);
      setPatientId(savedId);
      if (savedName) setSelectedPatientName(savedName);
    }
  }, []);

  const setSelectedPatientId = (id: string | null) => {
    setSelectedPatientIdState(id);
    setPatientId(id);
    
    if (id) {
      localStorage.setItem("medconnect_patient_id", id);
    } else {
      localStorage.removeItem("medconnect_patient_id");
      localStorage.removeItem("medconnect_patient_name");
      setSelectedPatientName(null);
    }
    
    // Invalidate all data queries to fetch for the new patient
    queryClient.invalidateQueries({
      predicate: (query) => query.queryKey[0] !== "family-groups"
    });
  };

  const setAndSavePatientName = (name: string | null) => {
    setSelectedPatientName(name);
    if (name) {
      localStorage.setItem("medconnect_patient_name", name);
    } else {
      localStorage.removeItem("medconnect_patient_name");
    }
  };

  return (
    <PatientContext.Provider value={{
      selectedPatientId,
      setSelectedPatientId,
      selectedPatientName,
      setSelectedPatientName: setAndSavePatientName
    }}>
      {children}
    </PatientContext.Provider>
  );
}

export const usePatientContext = () => useContext(PatientContext);
