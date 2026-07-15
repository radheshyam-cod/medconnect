"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import api from "@/lib/api-client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, UserPlus, Mail, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function FamilyPage() {
  const queryClient = useQueryClient();
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRelation, setInviteRelation] = useState("SPOUSE");
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  
  const { data: groups, isLoading } = useQuery({
    queryKey: ["family-groups"],
    queryFn: () => api.family.listGroups(),
  });

  const inviteMutation = useMutation({
    mutationFn: ({ groupId, email, relation }: any) => 
      api.family.inviteMember(groupId, email, relation),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["family-groups"] });
      setInviteEmail("");
    },
    onError: (error: any) => {
      alert(error.message || "Failed to invite member");
    }
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const ownedGroups = (groups as any)?.owned || [];
  const memberGroups = (groups as any)?.memberOf || [];

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-10">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Family Access</h1>
        <p className="text-muted-foreground">
          Manage family members and their access to your health records.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" /> My Family Groups
              </CardTitle>
              <CardDescription>Groups you have created to share your records.</CardDescription>
            </CardHeader>
            <CardContent>
              {ownedGroups.length > 0 ? (
                <div className="space-y-6">
                  {ownedGroups.map((group: any) => (
                    <div key={group.id} className="space-y-4 border rounded-lg p-4">
                      <div className="flex justify-between items-center">
                        <h3 className="font-semibold text-lg">{group.name}</h3>
                        <Button variant="outline" size="sm" onClick={() => setSelectedGroup(group.id)}>
                          <UserPlus className="h-4 w-4 mr-2" /> Invite Member
                        </Button>
                      </div>
                      
                      {group.members && group.members.length > 0 ? (
                        <div className="space-y-2">
                          {group.members.map((m: any) => (
                            <div key={m.id} className="flex items-center justify-between p-2 bg-muted/30 rounded-md text-sm">
                              <div className="flex items-center gap-3">
                                <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center">
                                  {m.member.fullName ? m.member.fullName.charAt(0) : <Users className="h-4 w-4" />}
                                </div>
                                <div>
                                  <p className="font-medium">{m.member.fullName || 'Unknown'}</p>
                                  <p className="text-xs text-muted-foreground">{m.member.email}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge variant="secondary">{m.relation}</Badge>
                                <Badge variant={m.status === 'PENDING' ? 'outline' : 'default'}>{m.status}</Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">No members in this group yet.</p>
                      )}

                      {selectedGroup === group.id && (
                        <div className="mt-4 p-4 border rounded-md bg-muted/10 space-y-3">
                          <h4 className="text-sm font-medium">Invite a new member</h4>
                          <div className="flex gap-2">
                            <input
                              type="email"
                              placeholder="Member's email address"
                              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                              value={inviteEmail}
                              onChange={e => setInviteEmail(e.target.value)}
                            />
                            <select 
                              className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
                              value={inviteRelation}
                              onChange={e => setInviteRelation(e.target.value)}
                            >
                              <option value="SPOUSE">Spouse</option>
                              <option value="CHILD">Child</option>
                              <option value="PARENT">Parent</option>
                              <option value="CAREGIVER">Caregiver</option>
                              <option value="OTHER">Other</option>
                            </select>
                            <Button 
                              onClick={() => inviteMutation.mutate({ groupId: group.id, email: inviteEmail, relation: inviteRelation })}
                              disabled={!inviteEmail || inviteMutation.isPending}
                            >
                              Send Invite
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-4">You haven't created any family groups yet.</p>
                  <Button onClick={() => alert('Creating groups will be available soon!')}>Create Group</Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Groups I'm a Member Of</CardTitle>
            </CardHeader>
            <CardContent>
              {memberGroups.length > 0 ? (
                <div className="space-y-4">
                  {memberGroups.map((m: any) => (
                    <div key={m.id} className="flex justify-between items-center p-3 border rounded-lg">
                      <div>
                        <h4 className="font-medium">{m.group.name}</h4>
                        <p className="text-sm text-muted-foreground">Owned by: {m.group.owner.fullName || m.group.owner.email}</p>
                      </div>
                      <Badge>{m.relation}</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">You are not a member of any other family groups.</p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-blue-500" />
                About Family Sharing
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-muted-foreground">
              <p>
                Family sharing allows you to securely grant access to your health records to trusted family members or caregivers.
              </p>
              <p>
                <strong>How it works:</strong>
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Create a family group.</li>
                <li>Invite members using their MedConnect email address.</li>
                <li>They will receive an invitation to view your records.</li>
              </ul>
              <p className="text-xs mt-4">
                You can revoke access at any time. Members only get "Viewer" permissions by default.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
