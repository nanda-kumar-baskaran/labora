"use client";
import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";
import { UserPlus, Users, ChevronDown, ChevronUp, KeyRound, Lock } from "lucide-react";
import { format } from "date-fns";

const ROLES = ["admin", "staff", "technician", "pathologist"] as const;
const roleColors: Record<string, any> = {
  admin: "destructive", staff: "default", technician: "secondary", pathologist: "success",
};

export default function UsersSettingsPage() {
  const { toast } = useToast();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [addForm, setAddForm] = useState({ email: "", full_name: "", role: "staff", phone: "", password: "", confirm_password: "" });

  // Reset password state per user (userId → { open, newPwd, confirmPwd, loading })
  const [resetState, setResetState] = useState<Record<string, { open: boolean; newPwd: string; confirmPwd: string; loading: boolean }>>({});

  // Change own password
  const [changePwd, setChangePwd] = useState({ current: "", next: "", confirm: "", loading: false, open: false });

  async function loadUsers() {
    const r = await fetch("/api/admin/users");
    if (r.ok) setUsers(await r.json());
    setLoading(false);
  }
  useEffect(() => { loadUsers(); }, []);

  function setAdd(k: string, v: string) { setAddForm(f => ({ ...f, [k]: v })); }

  async function handleAddUser(e: React.FormEvent) {
    e.preventDefault();
    if (addForm.password !== addForm.confirm_password) { toast("Passwords do not match", "error"); return; }
    setSaving(true);
    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: addForm.email, full_name: addForm.full_name, role: addForm.role, phone: addForm.phone, password: addForm.password }),
    });
    const data = await res.json();
    if (res.ok) {
      toast(`${addForm.full_name} added!`, "success");
      setAddForm({ email: "", full_name: "", role: "staff", phone: "", password: "", confirm_password: "" });
      setShowAddForm(false);
      await loadUsers();
    } else {
      toast(data.error ?? "Failed to add user", "error");
    }
    setSaving(false);
  }

  function openReset(userId: string) {
    setResetState(prev => ({ ...prev, [userId]: { open: true, newPwd: "", confirmPwd: "", loading: false } }));
  }
  function closeReset(userId: string) {
    setResetState(prev => ({ ...prev, [userId]: { open: false, newPwd: "", confirmPwd: "", loading: false } }));
  }
  function setReset(userId: string, k: string, v: string) {
    setResetState(prev => ({ ...prev, [userId]: { ...prev[userId], [k]: v } }));
  }

  async function handleResetPassword(userId: string, userName: string) {
    const state = resetState[userId];
    if (!state) return;
    if (state.newPwd !== state.confirmPwd) { toast("Passwords do not match", "error"); return; }
    if (state.newPwd.length < 8) { toast("Password must be at least 8 characters", "error"); return; }
    setResetState(prev => ({ ...prev, [userId]: { ...prev[userId], loading: true } }));
    const res = await fetch(`/api/admin/users/${userId}/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ new_password: state.newPwd }),
    });
    const data = await res.json();
    if (res.ok) {
      toast(`Password reset for ${userName}`, "success");
      closeReset(userId);
    } else {
      toast(data.error ?? "Reset failed", "error");
      setResetState(prev => ({ ...prev, [userId]: { ...prev[userId], loading: false } }));
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (changePwd.next !== changePwd.confirm) { toast("New passwords do not match", "error"); return; }
    if (changePwd.next.length < 8) { toast("Password must be at least 8 characters", "error"); return; }
    setChangePwd(p => ({ ...p, loading: true }));
    const res = await fetch("/api/auth/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ current_password: changePwd.current, new_password: changePwd.next }),
    });
    const data = await res.json();
    if (res.ok) {
      toast("Password changed successfully!", "success");
      setChangePwd({ current: "", next: "", confirm: "", loading: false, open: false });
    } else {
      toast(data.error ?? "Failed to change password", "error");
      setChangePwd(p => ({ ...p, loading: false }));
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Users className="h-6 w-6 text-red-500" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Staff Users</h1>
            <p className="text-sm text-gray-500">{users.length} users in your lab</p>
          </div>
        </div>
        <Button onClick={() => setShowAddForm(!showAddForm)} variant={showAddForm ? "outline" : "default"}>
          {showAddForm ? <ChevronUp className="h-4 w-4 mr-2" /> : <UserPlus className="h-4 w-4 mr-2" />}
          {showAddForm ? "Cancel" : "Add User"}
        </Button>
      </div>

      {/* Add user form */}
      {showAddForm && (
        <Card className="mb-6">
          <CardHeader><CardTitle>Add Staff User</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleAddUser} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Full Name *</Label><Input value={addForm.full_name} onChange={e => setAdd("full_name", e.target.value)} placeholder="Dr. Priya Patel" required /></div>
                <div className="space-y-2"><Label>Email *</Label><Input type="email" value={addForm.email} onChange={e => setAdd("email", e.target.value)} placeholder="staff@lab.com" required /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Role *</Label>
                  <Select value={addForm.role} onChange={e => setAdd("role", e.target.value)}>
                    <option value="staff">Staff (Receptionist)</option>
                    <option value="technician">Technician</option>
                    <option value="pathologist">Pathologist</option>
                    <option value="admin">Admin</option>
                  </Select>
                </div>
                <div className="space-y-2"><Label>Phone</Label><Input type="tel" value={addForm.phone} onChange={e => setAdd("phone", e.target.value)} placeholder="+91 98765 43210" /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Password * (min 8 chars)</Label><Input type="password" value={addForm.password} onChange={e => setAdd("password", e.target.value)} required /></div>
                <div className="space-y-2"><Label>Confirm Password *</Label><Input type="password" value={addForm.confirm_password} onChange={e => setAdd("confirm_password", e.target.value)} required /></div>
              </div>
              <Button type="submit" loading={saving}>Add User</Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Users table */}
      <Card className="mb-6">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && <TableRow><TableCell colSpan={6} className="text-center text-gray-400 py-8">Loading...</TableCell></TableRow>}
              {!loading && !users.length && <TableRow><TableCell colSpan={6} className="text-center text-gray-400 py-8">No users yet</TableCell></TableRow>}
              {users.map((u: any) => {
                const rs = resetState[u.id];
                return (
                  <React.Fragment key={u.id}>
                    <TableRow>
                      <TableCell className="font-medium">{u.full_name}</TableCell>
                      <TableCell className="text-gray-500 text-sm">{u.email ?? "—"}</TableCell>
                      <TableCell><Badge variant={roleColors[u.role] ?? "secondary"} className="capitalize">{u.role}</Badge></TableCell>
                      <TableCell><Badge variant={u.is_active ? "success" : "secondary"}>{u.is_active ? "Active" : "Inactive"}</Badge></TableCell>
                      <TableCell className="text-xs text-gray-400">{format(new Date(u.created_at), "dd MMM yyyy")}</TableCell>
                      <TableCell>
                        <Button size="sm" variant="outline" onClick={() => rs?.open ? closeReset(u.id) : openReset(u.id)}>
                          <KeyRound className="h-3 w-3 mr-1" />
                          {rs?.open ? "Cancel" : "Reset Password"}
                        </Button>
                      </TableCell>
                    </TableRow>
                    {rs?.open && (
                      <TableRow key={`${u.id}-reset`} className="bg-gray-50">
                        <TableCell colSpan={6} className="py-3 px-4">
                          <div className="flex items-end gap-3">
                            <div className="space-y-1">
                              <Label className="text-xs">New Password (min 8 chars)</Label>
                              <Input type="password" className="w-48 h-8 text-sm" placeholder="New password" value={rs.newPwd} onChange={e => setReset(u.id, "newPwd", e.target.value)} />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Confirm Password</Label>
                              <Input type="password" className="w-48 h-8 text-sm" placeholder="Confirm password" value={rs.confirmPwd} onChange={e => setReset(u.id, "confirmPwd", e.target.value)} />
                            </div>
                            <Button size="sm" loading={rs.loading} disabled={!rs.newPwd || !rs.confirmPwd}
                              onClick={() => handleResetPassword(u.id, u.full_name)}>
                              Set Password
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => closeReset(u.id)}>Cancel</Button>
                          </div>
                          {rs.newPwd && rs.confirmPwd && rs.newPwd !== rs.confirmPwd && (
                            <p className="text-xs text-red-500 mt-1">Passwords do not match</p>
                          )}
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Change own password */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Lock className="h-4 w-4" />
              Change My Password
            </CardTitle>
            <Button size="sm" variant="outline" onClick={() => setChangePwd(p => ({ ...p, open: !p.open }))}>
              {changePwd.open ? "Cancel" : "Change Password"}
            </Button>
          </div>
        </CardHeader>
        {changePwd.open && (
          <CardContent>
            <form onSubmit={handleChangePassword} className="space-y-4 max-w-sm">
              <div className="space-y-2">
                <Label>Current Password</Label>
                <Input type="password" value={changePwd.current} onChange={e => setChangePwd(p => ({ ...p, current: e.target.value }))} placeholder="Current password" required />
              </div>
              <div className="space-y-2">
                <Label>New Password (min 8 chars)</Label>
                <Input type="password" value={changePwd.next} onChange={e => setChangePwd(p => ({ ...p, next: e.target.value }))} placeholder="New password" required />
              </div>
              <div className="space-y-2">
                <Label>Confirm New Password</Label>
                <Input type="password" value={changePwd.confirm} onChange={e => setChangePwd(p => ({ ...p, confirm: e.target.value }))} placeholder="Confirm new password" required />
              </div>
              {changePwd.next && changePwd.confirm && changePwd.next !== changePwd.confirm && (
                <p className="text-xs text-red-500">Passwords do not match</p>
              )}
              <Button type="submit" loading={changePwd.loading}>Update Password</Button>
            </form>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
