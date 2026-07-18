"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import api from "@/lib/api-client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Users,
  UserPlus,
  Mail,
  AlertCircle,
  Loader2,
  Shield,
  User,
  CheckCircle2,
  Clock,
  X,
  Plus,
  QrCode,
  Copy,
  Trash2,
  LogOut
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const RELATIONS = [
  { value: "SPOUSE", label: "Spouse" },
  { value: "CHILD", label: "Child" },
  { value: "PARENT", label: "Parent" },
  { value: "SIBLING", label: "Sibling" },
  { value: "CAREGIVER", label: "Caregiver" },
  { value: "OTHER", label: "Other" },
];

export default function FamilyPage() {
  const queryClient = useQueryClient();
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRelation, setInviteRelation] = useState("SPOUSE");
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");

  const { data, isLoading, isError } = useQuery({
    queryKey: ["family-groups"],
    queryFn: () => api.family.listGroups(),
  });

  const inviteMutation = useMutation({
    mutationFn: ({ groupId, email, relation }: any) => api.family.inviteMember(groupId, email, relation),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["family-groups"] });
      setInviteEmail("");
      toast.success("Invitation sent!");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to invite member");
    },
  });

  const createGroupMutation = useMutation({
    mutationFn: (name: string) => api.family.createGroup(name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["family-groups"] });
      setShowCreateGroup(false);
      setNewGroupName("");
      toast.success("Family group created!");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to create group");
    },
  });

  const respondMutation = useMutation({
    mutationFn: ({ groupId, action }: { groupId: string; action: "ACCEPT" | "REJECT" }) =>
      api.family.respondToInvite(groupId, action),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["family-groups"] });
      toast.success("Responded to invitation!");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to respond to invitation");
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: ({ groupId, memberId }: { groupId: string; memberId: string }) =>
      api.family.removeMember(groupId, memberId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["family-groups"] });
      toast.success("Member removed from group");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to remove member");
    },
  });

  const deleteGroupMutation = useMutation({
    mutationFn: (groupId: string) => api.family.deleteGroup(groupId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["family-groups"] });
      toast.success("Family group deleted");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to delete group");
    },
  });

  const ownedGroups = (data as any)?.owned || [];
  const memberGroups = (data as any)?.memberOf || [];

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh]">
        <AlertCircle className="h-12 w-12 text-destructive mb-4" />
        <p className="font-semibold">Failed to load family groups</p>
        <Button variant="outline" className="mt-4" onClick={() => queryClient.invalidateQueries({ queryKey: ["family-groups"] })}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" />
            Family Access
          </h1>
          <p className="text-muted-foreground text-sm">
            Manage family members and their access to your health records.
          </p>
        </div>
        <Button onClick={() => setShowCreateGroup(!showCreateGroup)}>
          <Plus className="h-4 w-4 mr-1.5" />
          Create Group
        </Button>
      </div>

      {/* Create Group Dialog */}
      <AnimatePresence>
        {showCreateGroup && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <Card className="border-primary/20">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold">Create Family Group</h3>
                  <Button variant="ghost" size="icon" onClick={() => setShowCreateGroup(false)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex gap-3">
                  <Input
                    placeholder="Enter group name..."
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    className="flex-1"
                  />
                  <Button
                    onClick={() => createGroupMutation.mutate(newGroupName)}
                    disabled={!newGroupName.trim() || createGroupMutation.isPending}
                  >
                    {createGroupMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Create
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* My Groups */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                My Family Groups
              </CardTitle>
              <CardDescription>Groups you have created to share your health records.</CardDescription>
            </CardHeader>
            <CardContent>
              {ownedGroups.length > 0 ? (
                <div className="space-y-6">
                  {ownedGroups.map((group: any, gi: number) => (
                    <motion.div
                      key={group.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: gi * 0.1 }}
                      className="border rounded-xl overflow-hidden"
                    >
                      {/* Group Header */}
                      <div className="flex items-center justify-between p-4 bg-muted/20 border-b">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                            <Users className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <h3 className="font-semibold">{group.name}</h3>
                            <p className="text-xs text-muted-foreground">{group.members?.length || 0} members</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedGroup(selectedGroup === group.id ? null : group.id)}
                          >
                            <UserPlus className="h-4 w-4 mr-1.5" />
                            Invite
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            title="Delete Group"
                            onClick={() => {
                              if (window.confirm('Are you sure you want to delete this family group? This will revoke access for all members.')) {
                                deleteGroupMutation.mutate(group.id);
                              }
                            }}
                            disabled={deleteGroupMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      {/* Members */}
                      <div className="p-4 space-y-2">
                        {group.members && group.members.length > 0 ? (
                          group.members.map((m: any) => (
                            <div key={m.id} className="flex items-center justify-between rounded-lg p-3 bg-muted/30 hover:bg-muted/50 transition-colors">
                              <div className="flex items-center gap-3">
                                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/20 text-xs font-bold text-primary">
                                  {m.member.fullName?.charAt(0) || m.member.email?.charAt(0) || "?"}
                                </div>
                                <div>
                                  <p className="text-sm font-medium">{m.member.fullName || "Unknown"}</p>
                                  <p className="text-xs text-muted-foreground">{m.member.email}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge variant="secondary" className="text-[10px]">{m.relation}</Badge>
                                <Badge
                                  variant={m.status === "PENDING" ? "outline" : m.status === "ACCEPTED" ? "success" : "secondary"}
                                  className="text-[10px]"
                                >
                                  {m.status === "PENDING" ? (
                                    <Clock className="h-3 w-3 mr-1" />
                                  ) : m.status === "ACCEPTED" ? (
                                    <CheckCircle2 className="h-3 w-3 mr-1" />
                                  ) : null}
                                  {m.status}
                                </Badge>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 ml-1 text-muted-foreground hover:text-destructive"
                                  title="Remove member"
                                  onClick={() => {
                                    if (window.confirm(`Are you sure you want to remove ${m.member.fullName || m.member.email} from this group?`)) {
                                      removeMemberMutation.mutate({ groupId: group.id, memberId: m.memberId });
                                    }
                                  }}
                                  disabled={removeMemberMutation.isPending}
                                >
                                  <X className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-muted-foreground text-center py-4">No members in this group yet.</p>
                        )}

                        {/* Invite Form */}
                        {selectedGroup === group.id && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            className="mt-3 p-3 border rounded-lg bg-muted/10 space-y-3"
                          >
                            <h4 className="text-sm font-medium">Invite a new member</h4>
                            <div className="flex flex-col sm:flex-row gap-2">
                              <div className="relative flex-1">
                                <Mail className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <input
                                  type="email"
                                  placeholder="Member's email address"
                                  className="flex h-9 w-full rounded-md border border-input bg-transparent pl-8 pr-3 py-1 text-sm"
                                  value={inviteEmail}
                                  onChange={(e) => setInviteEmail(e.target.value)}
                                />
                              </div>
                              <select
                                className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
                                value={inviteRelation}
                                onChange={(e) => setInviteRelation(e.target.value)}
                              >
                                {RELATIONS.map((r) => (
                                  <option key={r.value} value={r.value}>{r.label}</option>
                                ))}
                              </select>
                              <Button
                                onClick={() => inviteMutation.mutate({ groupId: group.id, email: inviteEmail, relation: inviteRelation })}
                                disabled={!inviteEmail || inviteMutation.isPending}
                                size="sm"
                              >
                                {inviteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send"}
                              </Button>
                            </div>
                          </motion.div>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted mx-auto">
                    <Users className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <p className="font-medium">No family groups yet</p>
                  <p className="text-sm text-muted-foreground mt-1">Create a group to share your health records with family members.</p>
                  <Button onClick={() => setShowCreateGroup(true)} className="mt-4">
                    <Plus className="h-4 w-4 mr-1.5" /> Create Group
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Groups I'm Member Of */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Groups I&apos;m a Member Of
              </CardTitle>
            </CardHeader>
            <CardContent>
              {memberGroups.length > 0 ? (
                <div className="space-y-3">
                  {memberGroups.map((m: any, i: number) => (
                    <motion.div
                      key={m.id}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950/50">
                          <Shield className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <div>
                          <h4 className="text-sm font-medium">{m.group.name}</h4>
                          <p className="text-xs text-muted-foreground">
                            Owned by: {m.group.owner?.fullName || m.group.owner?.email || "Unknown"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-[10px]">{m.relation}</Badge>
                        {m.status === "PENDING" && (
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs px-2"
                              disabled={respondMutation.isPending}
                              onClick={() => respondMutation.mutate({ groupId: m.groupId, action: "REJECT" })}
                            >
                              Reject
                            </Button>
                            <Button
                              size="sm"
                              className="h-7 text-xs px-2 bg-emerald-600 hover:bg-emerald-700"
                              disabled={respondMutation.isPending}
                              onClick={() => respondMutation.mutate({ groupId: m.groupId, action: "ACCEPT" })}
                            >
                              Accept
                            </Button>
                          </div>
                        )}
                        {m.status === "ACCEPTED" && (
                          <Badge variant="success" className="text-[10px]">
                            <CheckCircle2 className="h-3 w-3 mr-1" /> Accepted
                          </Badge>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive ml-1"
                          title="Leave group"
                          onClick={() => {
                            if (window.confirm(`Are you sure you want to leave ${m.group.name}? You will lose access to their records.`)) {
                              removeMemberMutation.mutate({ groupId: m.groupId, memberId: m.memberId });
                            }
                          }}
                          disabled={removeMemberMutation.isPending}
                        >
                          <LogOut className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-6">
                  You are not a member of any other family groups.
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
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
              <Separator />
              <div>
                <h4 className="font-medium text-foreground mb-2">How it works:</h4>
                <ul className="space-y-2">
                  <li className="flex items-start gap-2">
                    <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                      <span className="text-[10px] font-bold text-primary">1</span>
                    </div>
                    <span>Create a family group</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                      <span className="text-[10px] font-bold text-primary">2</span>
                    </div>
                    <span>Invite members using their email</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                      <span className="text-[10px] font-bold text-primary">3</span>
                    </div>
                    <span>They get read-only viewer access</span>
                  </li>
                </ul>
              </div>
              <Separator />
              <p className="text-xs">
                You can revoke access at any time. Members only get &ldquo;Viewer&rdquo; permissions by default.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
