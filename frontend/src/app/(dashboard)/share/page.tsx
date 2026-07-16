"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import api from "@/lib/api-client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Share2,
  Link2,
  Copy,
  Trash2,
  Clock,
  ShieldCheck,
  Loader2,
  QrCode,
  ExternalLink,
  AlertCircle,
  CheckCircle2,
  Lock,
  X,
  History,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { formatDate, formatDateTime } from "@/lib/utils";
import { cn } from "@/lib/utils";

export default function SharingPage() {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [expiresIn, setExpiresIn] = useState("7");
  const [showForm, setShowForm] = useState(false);

  const { data: links, isLoading, isError } = useQuery({
    queryKey: ["share-links"],
    queryFn: () => api.sharing.listLinks(),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => api.sharing.createLink(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["share-links"] });
      setShowForm(false);
      setTitle("");
      toast.success("Share link created!");
    },
    onError: (err: any) => toast.error(err.message || "Failed to create link"),
  });

  const revokeMutation = useMutation({
    mutationFn: (id: string) => api.sharing.revokeLink(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["share-links"] });
      toast.success("Share link revoked");
    },
    onError: (err: any) => toast.error(err.message || "Failed to revoke link"),
  });

  const handleCreate = () => {
    createMutation.mutate({
      title: title || "My Health Record Share",
      expiresInDays: parseInt(expiresIn),
      resources: [{ resourceType: "FULL_SUMMARY", resourceId: "all" }],
    });
  };

  const copyToClipboard = (token: string) => {
    const url = `${window.location.origin}/public/share/${token}`;
    navigator.clipboard.writeText(url);
    toast.success("Link copied to clipboard!");
  };

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
        <p className="font-semibold">Failed to load share links</p>
        <Button variant="outline" className="mt-4" onClick={() => queryClient.invalidateQueries({ queryKey: ["share-links"] })}>
          Retry
        </Button>
      </div>
    );
  }

  const activeLinks = links?.filter(l => !l.isRevoked) ?? [];
  const revokedLinks = links?.filter(l => l.isRevoked) ?? [];

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Share2 className="h-6 w-6 text-primary" />
            Secure Sharing
          </h1>
          <p className="text-muted-foreground text-sm">
            Generate secure, expiring links to share your health records with doctors.
          </p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? (
            <X className="h-4 w-4 mr-1.5" />
          ) : (
            <Link2 className="h-4 w-4 mr-1.5" />
          )}
          {showForm ? "Cancel" : "Create Share Link"}
        </Button>
      </div>

      {/* Stats */}
      {links && links.length > 0 && (
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">{links.length} total</span>
          <span className="flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3 text-emerald-500" />
            {activeLinks.length} active
          </span>
          {revokedLinks.length > 0 && (
            <span className="flex items-center gap-1">
              <X className="h-3 w-3 text-muted-foreground" />
              {revokedLinks.length} revoked
            </span>
          )}
        </div>
      )}

      {/* Create Form */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <Card className="border-primary/30 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lock className="h-5 w-5 text-primary" />
                  New Secure Share Link
                </CardTitle>
                <CardDescription>
                  This link will allow anyone with the URL to view a read-only version of your clinical summary.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Link Title (Optional)</label>
                    <Input
                      placeholder="e.g., Dr. Smith Appointment"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Expires In</label>
                    <select
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                      value={expiresIn}
                      onChange={(e) => setExpiresIn(e.target.value)}
                    >
                      <option value="1">1 Day</option>
                      <option value="7">7 Days</option>
                      <option value="30">30 Days</option>
                      <option value="90">90 Days</option>
                    </select>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="justify-end space-x-2">
                <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
                <Button onClick={handleCreate} disabled={createMutation.isPending}>
                  {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  <Link2 className="h-4 w-4 mr-1.5" />
                  Generate Link
                </Button>
              </CardFooter>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Active Links */}
      {links && links.length > 0 ? (
        <div className="space-y-4">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-500" />
            Active Share Links
          </h3>

          {activeLinks.length === 0 && (
            <Card>
              <CardContent className="py-8 text-center text-sm text-muted-foreground">
                No active share links. Create one above.
              </CardContent>
            </Card>
          )}

          {activeLinks.map((link: any, i: number) => (
            <motion.div
              key={link.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Card className="overflow-hidden hover:shadow-md transition-shadow">
                <div className="flex flex-col md:flex-row">
                  <div className="flex-1 p-6">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-base font-semibold">{link.title || "Shared Record"}</h3>
                      <Badge variant="success" className="text-[9px] h-4">
                        <CheckCircle2 className="h-2.5 w-2.5 mr-0.5" /> Active
                      </Badge>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground mt-3">
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-4 w-4" />
                        <span>Expires: {formatDate(link.expiresAt)}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <ShieldCheck className="h-4 w-4" />
                        <span>Read-Only Access</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <History className="h-4 w-4" />
                        <span>{link.accessLogs?.length || 0} access(es)</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-muted/30 border-t md:border-t-0 md:border-l p-6 flex flex-col justify-center gap-2">
                    <Button variant="secondary" size="sm" className="w-full" onClick={() => copyToClipboard(link.token)}>
                      <Copy className="h-4 w-4 mr-1.5" /> Copy Link
                    </Button>
                    <Button variant="destructive" size="sm" className="w-full" onClick={() => revokeMutation.mutate(link.id)} disabled={revokeMutation.isPending}>
                      {revokeMutation.isPending ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Trash2 className="h-4 w-4 mr-1.5" />}
                      Revoke Access
                    </Button>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}

          {/* Revoked Links */}
          {revokedLinks.length > 0 && (
            <div className="pt-4">
              <h3 className="text-sm font-semibold flex items-center gap-2 text-muted-foreground mb-3">
                <X className="h-4 w-4" />
                Revoked Links
              </h3>
              <div className="space-y-2">
                {revokedLinks.map((link: any) => (
                  <div key={link.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/20 border text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">{link.title || "Shared Record"}</span>
                      <Badge variant="destructive" className="text-[9px] h-4">Revoked</Badge>
                    </div>
                    <span className="text-xs text-muted-foreground">Revoked on {formatDate(link.updatedAt || link.createdAt)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-16 border-2 border-dashed rounded-xl">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted mx-auto">
            <Link2 className="h-8 w-8 text-muted-foreground/50" />
          </div>
          <h3 className="text-lg font-semibold">No Share Links Yet</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
            Create a secure link to share your medical history with healthcare providers. Links are encrypted and expire automatically.
          </p>
          <Button onClick={() => setShowForm(true)} className="mt-6">
            <Link2 className="h-4 w-4 mr-1.5" /> Create Your First Link
          </Button>
        </div>
      )}
    </div>
  );
}
