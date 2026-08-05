import React, { useState } from 'react';
import { ShieldCheck, Plus, Check, Lock, Sparkles, Trash2 } from 'lucide-react';
import { useRoleStore, RoleItem } from '@/stores/useRoleStore';
import { Card } from '../atoms/Card';
import { Button } from '../atoms/Button';
import { Badge } from '../atoms/Badge';
import { Input } from '../atoms/Input';
import { Label } from '../atoms/Label';

export const ALL_FEATURES = [
  { key: 'dashboard', label: 'Dashboard Utama', path: '/' },
  { key: 'absensi', label: 'Lembar Absensi & Presensi AI', path: '/absensi' },
  { key: 'jadwal', label: 'Jadwal Ngajar', path: '/jadwal' },
  { key: 'penggajian', label: 'Rekap Penggajian Guru', path: '/penggajian' },
  { key: 'perkembangan-siswa', label: 'Catatan Progress Siswa', path: '/perkembangan-siswa' },
  { key: 'data-master', label: 'Data Master (Guru & Siswa)', path: '/data-master' },
  { key: 'role-management', label: 'Manajemen Peran & Izin', path: '/data-master' }
];

export const RoleManagementCard: React.FC = () => {
  const { roles, addRole, updateRolePermissions, deleteRole } = useRoleStore();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [roleName, setRoleName] = useState('');
  const [roleDesc, setRoleDesc] = useState('');
  const [selectedPerms, setSelectedPerms] = useState<string[]>(['dashboard']);

  const handleCreateRole = (e: React.FormEvent) => {
    e.preventDefault();
    if (!roleName.trim()) return;

    addRole({
      name: roleName,
      description: roleDesc || 'Peran kustom buatan admin',
      permissions: selectedPerms
    });

    setRoleName('');
    setRoleDesc('');
    setSelectedPerms(['dashboard']);
    setIsFormOpen(false);
  };

  const togglePermission = (role: RoleItem, permKey: string) => {
    const hasPerm = role.permissions.includes(permKey);
    const updated = hasPerm
      ? role.permissions.filter((p) => p !== permKey)
      : [...role.permissions, permKey];

    updateRolePermissions(role.id, updated);
  };

  const handleToggleNewPerm = (key: string) => {
    setSelectedPerms((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  return (
    <Card className="p-6 space-y-6 bg-white border border-slate-200">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            <h3 className="font-bold text-slate-900 text-lg">Manajemen Peran (Roles) & Ability</h3>
          </div>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Setiap peran dikelola menggunakan <strong>UUID</strong> unik untuk fleksibilitas penambahan role kustom.
          </p>
        </div>

        <Button variant="primary" size="md" onClick={() => setIsFormOpen(!isFormOpen)}>
          <Plus className="w-4 h-4 mr-1 text-amber-300" /> Tambah Peran Baru (UUID)
        </Button>
      </div>

      {isFormOpen && (
        <Card variant="emerald" className="p-5 border-2 border-emerald-300">
          <form onSubmit={handleCreateRole} className="space-y-4">
            <h4 className="font-bold text-slate-900 text-sm">Form Peran Kustom Baru</h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label required>Nama Peran:</Label>
                <Input
                  required
                  value={roleName}
                  onChange={(e) => setRoleName(e.target.value)}
                  placeholder="Misal: Guru Piket"
                />
              </div>

              <div>
                <Label>Deskripsi Singkat:</Label>
                <Input
                  value={roleDesc}
                  onChange={(e) => setRoleDesc(e.target.value)}
                  placeholder="Hak akses khusus..."
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Pilih Akses Modul:</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {ALL_FEATURES.map((feat) => {
                  const isChecked = selectedPerms.includes(feat.key);
                  return (
                    <button
                      key={feat.key}
                      type="button"
                      onClick={() => handleToggleNewPerm(feat.key)}
                      className={`p-2.5 rounded-xl border text-left text-xs font-semibold flex items-center justify-between transition ${
                        isChecked
                          ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <span>{feat.label}</span>
                      {isChecked && <Check className="w-4 h-4 text-emerald-600" />}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" type="button" onClick={() => setIsFormOpen(false)}>
                Batal
              </Button>
              <Button variant="primary" type="submit">
                Simpan Peran
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Role List Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {roles.map((role) => {
          const isAdmin = role.id === '11111111-1111-1111-1111-000000000001';

          return (
            <div
              key={role.id}
              className="p-5 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-4 flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-base">{role.name}</span>
                    {isAdmin && (
                      <Badge variant="amber" size="sm">
                        <Lock className="w-3 h-3 mr-1" /> Super Admin
                      </Badge>
                    )}
                  </div>

                  {!isAdmin && (
                    <button
                      onClick={() => deleteRole(role.id)}
                      className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                      title="Hapus Peran"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <p className="text-xs text-slate-500 leading-relaxed font-medium">
                  {role.description}
                </p>
                <div className="text-[10px] text-slate-400 font-mono">UUID: {role.id}</div>
              </div>

              {/* Ability Toggles */}
              <div className="space-y-2 border-t border-slate-200/80 pt-3">
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Daftar Akses Ability Modul:
                </div>

                <div className="grid grid-cols-1 gap-1.5">
                  {ALL_FEATURES.map((feat) => {
                    const hasAccess = isAdmin || role.permissions.includes(feat.key);

                    return (
                      <div
                        key={feat.key}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center justify-between transition ${
                          hasAccess
                            ? 'bg-emerald-100/70 text-emerald-900'
                            : 'bg-white text-slate-400 border border-slate-200'
                        }`}
                      >
                        <span className="truncate">{feat.label}</span>

                        <div className="flex items-center gap-1.5">
                          {isAdmin ? (
                            <span className="text-[10px] text-amber-700 font-bold">Penuh</span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => togglePermission(role, feat.key)}
                              className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition cursor-pointer ${
                                hasAccess
                                  ? 'bg-emerald-600 text-white'
                                  : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                              }`}
                            >
                              {hasAccess ? 'Aktif ✓' : 'Nonaktif'}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
};
