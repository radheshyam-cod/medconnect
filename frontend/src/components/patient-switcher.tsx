"use client";

import { useQuery } from "@tanstack/react-query";
import { usePatientContext } from "./patient-context";
import { api } from "@/lib/api-client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Users, User as UserIcon } from "lucide-react";

export function PatientSwitcher() {
  const { selectedPatientId, setSelectedPatientId, setSelectedPatientName } = usePatientContext();

  const { data: familyData } = useQuery({
    queryKey: ["family-groups"],
    queryFn: () => api.family.listGroups(),
  });

  const memberGroups = (familyData as any)?.memberOf || [];

  if (memberGroups.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 mr-4">
      <div className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground mr-1">
        <Users className="h-4 w-4" />
        <span className="font-medium">Viewing:</span>
      </div>
      <Select
        value={selectedPatientId || "me"}
        onValueChange={(value) => {
          if (value === "me") {
            setSelectedPatientId(null);
          } else {
            const member = memberGroups.find((m: any) => m.group.ownerId === value);
            setSelectedPatientId(value);
            setSelectedPatientName(member?.group?.owner?.fullName || "Family Member");
          }
        }}
      >
        <SelectTrigger className="w-[180px] h-8 bg-muted/50 border-0">
          <SelectValue placeholder="My Records" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="me">
            <div className="flex items-center gap-2">
              <UserIcon className="h-4 w-4 text-primary" />
              <span>My Records</span>
            </div>
          </SelectItem>
          {memberGroups
            .filter((m: any) => m.status === "ACCEPTED")
            .map((m: any) => (
              <SelectItem key={m.group.ownerId} value={m.group.ownerId}>
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-emerald-500" />
                  <span>{m.group.owner?.fullName || "Family Member"}</span>
                </div>
              </SelectItem>
            ))}
        </SelectContent>
      </Select>
    </div>
  );
}
