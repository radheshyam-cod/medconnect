"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import api from "@/lib/api-client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Share2, Link2, Copy, Trash2, Clock, ShieldCheck, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function SharingPage() {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [expiresIn, setExpiresIn] = useState("7");
  const [showForm, setShowForm] = useState(false);

  const { data: links, isLoading } = useQuery({
    queryKey: ["share-links"],
    queryFn: () => api.sharing.listLinks(),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => api.sharing.createLink(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["share-links"] });
      setShowForm(false);
      setTitle("");
    },
  });

  const revokeMutation = useMutation({
    mutationFn: (id: string) => api.sharing.revokeLink(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["share-links"] }),
  });

  const handleCreate = () => {
    // In a real app, you'd select specific resources.
    // For now, we'll create a generic link that implies "full summary" access.
    createMutation.mutate({
      title: title || "My Health Record Share",
      expiresInDays: parseInt(expiresIn),
      resources: [{ resourceType: "FULL_SUMMARY", resourceId: "all" }]
    });
  };

  const copyToClipboard = (token: string) => {
    const url = `${window.location.origin}/public/share/${token}`;
    navigator.clipboard.writeText(url);
    alert("Link copied to clipboard!");
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Secure Sharing</h1>
          <p className="text-muted-foreground">
            Generate secure, temporary links to share your health records with doctors.
          </p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          <Share2 className="h-4 w-4 mr-2" /> 
          {showForm ? "Cancel" : "Create Share Link"}
        </Button>
      </div>

      {showForm && (
        <Card className="border-primary/50 shadow-md">
          <CardHeader>
            <CardTitle>Create New Share Link</CardTitle>
            <CardDescription>This link will allow anyone with the URL to view a read-only version of your clinical summary.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Link Title (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g., Dr. Smith Appointment"
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
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
                </select>
              </div>
            </div>
          </CardContent>
          <CardFooter className="justify-end space-x-2">
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={createMutation.isPending}>
              {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Generate Link
            </Button>
          </CardFooter>
        </Card>
      )}

      <div className="grid gap-4">
        {links && links.length > 0 ? (
          links.map((link: any) => (
            <Card key={link.id} className="overflow-hidden">
              <div className="flex flex-col md:flex-row">
                <div className="flex-1 p-6">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-lg font-semibold">{link.title || "Shared Record"}</h3>
                    <Badge variant={link.isRevoked ? "destructive" : "default"}>
                      {link.isRevoked ? "Revoked" : "Active"}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center gap-4 text-sm text-muted-foreground mt-4">
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      Expires: {new Date(link.expiresAt).toLocaleDateString()}
                    </div>
                    <div className="flex items-center gap-1">
                      <ShieldCheck className="h-4 w-4" />
                      Access: Read-Only
                    </div>
                  </div>
                </div>
                
                <div className="bg-muted/30 border-t md:border-t-0 md:border-l p-6 flex flex-col justify-center gap-3 min-w-[200px]">
                  {!link.isRevoked && (
                    <Button variant="secondary" className="w-full" onClick={() => copyToClipboard(link.token)}>
                      <Copy className="h-4 w-4 mr-2" /> Copy Link
                    </Button>
                  )}
                  <Button 
                    variant="destructive" 
                    className="w-full"
                    onClick={() => revokeMutation.mutate(link.id)}
                    disabled={link.isRevoked || revokeMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4 mr-2" /> Revoke Access
                  </Button>
                </div>
              </div>
            </Card>
          ))
        ) : (
          <div className="text-center py-12 border border-dashed rounded-lg">
            <Link2 className="h-10 w-10 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium">No active share links</h3>
            <p className="text-muted-foreground">Create a secure link to share your medical history with healthcare providers.</p>
          </div>
        )}
      </div>
    </div>
  );
}
