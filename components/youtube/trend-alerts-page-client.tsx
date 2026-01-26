"use client";

import { useState } from "react";
import { Bell, Plus, Trash2, Edit2, Check, X, TrendingUp, Search, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTrendAlerts, useCreateTrendAlert, useUpdateTrendAlert, useDeleteTrendAlert } from "@/hooks/use-trend-alerts";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const CATEGORIES = [
  { value: "tech", label: "Technology" },
  { value: "gaming", label: "Gaming" },
  { value: "fitness", label: "Fitness" },
  { value: "food", label: "Food & Cooking" },
  { value: "travel", label: "Travel" },
  { value: "beauty", label: "Beauty" },
  { value: "education", label: "Education" },
  { value: "entertainment", label: "Entertainment" },
];

export function TrendAlertsPageClient() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingAlert, setEditingAlert] = useState<string | null>(null);
  const [deletingAlert, setDeletingAlert] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    keyword: "",
    category: "none",
    minMomentum: 10,
    minSearchVolume: 1000,
  });

  const { data, isLoading } = useTrendAlerts(false);
  const alerts = data?.alerts || [];

  const createMutation = useCreateTrendAlert();
  const updateMutation = useUpdateTrendAlert();
  const deleteMutation = useDeleteTrendAlert();

  const handleCreate = async () => {
    if (!formData.keyword.trim()) {
      toast.error("Keyword is required");
      return;
    }

    try {
      await createMutation.mutateAsync({
        keyword: formData.keyword.trim(),
        category: formData.category === "none" ? undefined : formData.category,
        minMomentum: formData.minMomentum,
        minSearchVolume: formData.minSearchVolume,
      });
      toast.success("Alert created successfully");
      setIsCreateDialogOpen(false);
      setFormData({
        keyword: "",
        category: "none",
        minMomentum: 10,
        minSearchVolume: 1000,
      });
    } catch (error: any) {
      toast.error(error.message || "Failed to create alert");
    }
  };

  const handleToggleActive = async (alertId: string, currentStatus: boolean) => {
    try {
      await updateMutation.mutateAsync({
        alertId,
        data: { isActive: !currentStatus },
      });
      toast.success(`Alert ${!currentStatus ? "activated" : "deactivated"}`);
    } catch (error) {
      toast.error("Failed to update alert");
    }
  };

  const handleDelete = async () => {
    if (!deletingAlert) return;

    try {
      await deleteMutation.mutateAsync(deletingAlert);
      toast.success("Alert deleted successfully");
      setDeletingAlert(null);
    } catch (error) {
      toast.error("Failed to delete alert");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight mb-2">Trend Alerts</h1>
          <p className="text-muted-foreground text-lg">
            Get notified when keywords in your niche start trending based on your custom criteria.
          </p>
        </div>

        {/* Create Alert Button */}
        <div className="mb-6">
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="cursor-pointer bg-[#006DCA] hover:bg-[#0056A3] text-white">
                <Plus className="h-4 w-4 mr-2" />
                Create Alert
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Trend Alert</DialogTitle>
                <DialogDescription>
                  Set up an alert to be notified when a keyword matches your criteria.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="keyword">Keyword *</Label>
                  <Input
                    id="keyword"
                    placeholder="e.g., iPhone 15, cooking tips"
                    value={formData.keyword}
                    onChange={(e) => setFormData({ ...formData, keyword: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">Category (Optional)</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => setFormData({ ...formData, category: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {CATEGORIES.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="minMomentum">Minimum Momentum (%)</Label>
                  <Input
                    id="minMomentum"
                    type="number"
                    min="0"
                    value={formData.minMomentum}
                    onChange={(e) =>
                      setFormData({ ...formData, minMomentum: parseFloat(e.target.value) || 0 })
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Alert will trigger when trend momentum is at least this percentage
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="minSearchVolume">Minimum Search Volume</Label>
                  <Input
                    id="minSearchVolume"
                    type="number"
                    min="0"
                    value={formData.minSearchVolume}
                    onChange={(e) =>
                      setFormData({ ...formData, minSearchVolume: parseInt(e.target.value) || 0 })
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Alert will trigger when search volume is at least this number
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsCreateDialogOpen(false)}
                  className="cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreate}
                  disabled={createMutation.isPending}
                  className="cursor-pointer bg-[#006DCA] hover:bg-[#0056A3] text-white"
                >
                  {createMutation.isPending ? "Creating..." : "Create Alert"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Alerts List */}
        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-48" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-20 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : alerts.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No alerts yet</h3>
              <p className="text-muted-foreground mb-4">
                Create your first trend alert to get notified about trending opportunities.
              </p>
              <Button
                onClick={() => setIsCreateDialogOpen(true)}
                className="cursor-pointer bg-[#006DCA] hover:bg-[#0056A3] text-white"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Alert
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {alerts.map((alert) => (
              <Card key={alert.id} className={cn(!alert.isActive && "opacity-60")}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <CardTitle className="text-lg">{alert.keyword}</CardTitle>
                        {alert.isActive ? (
                          <Badge className="bg-green-500/20 text-green-700 dark:text-green-400 border-green-500/30">
                            Active
                          </Badge>
                        ) : (
                          <Badge variant="secondary">Inactive</Badge>
                        )}
                        {alert.category && (
                          <Badge variant="outline">{CATEGORIES.find((c) => c.value === alert.category)?.label || alert.category}</Badge>
                        )}
                      </div>
                      <CardDescription>
                        Triggered {alert.triggerCount} time{alert.triggerCount !== 1 ? "s" : ""}
                        {alert.lastTriggered && (
                          <span className="ml-2">
                            • Last triggered: {new Date(alert.lastTriggered).toLocaleDateString()}
                          </span>
                        )}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleActive(alert.id, alert.isActive)}
                        className="cursor-pointer"
                      >
                        {alert.isActive ? (
                          <X className="h-4 w-4" />
                        ) : (
                          <Check className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeletingAlert(alert.id)}
                        className="cursor-pointer text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Min Momentum</p>
                      <p className="text-lg font-semibold">{alert.minMomentum}%</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Min Search Volume</p>
                      <p className="text-lg font-semibold">{alert.minSearchVolume.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Created</p>
                      <p className="text-sm font-medium">
                        {new Date(alert.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Status</p>
                      <p className="text-sm font-medium">
                        {alert.isActive ? "Monitoring" : "Paused"}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={!!deletingAlert} onOpenChange={(open) => !open && setDeletingAlert(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Alert</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this alert? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="cursor-pointer">Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                disabled={deleteMutation.isPending}
                className="cursor-pointer bg-destructive hover:bg-destructive/90"
              >
                {deleteMutation.isPending ? "Deleting..." : "Delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
