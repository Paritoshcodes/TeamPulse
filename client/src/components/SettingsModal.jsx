import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Bell, User, Monitor, Lock, Shield, Moon, Sun, MonitorSmartphone } from 'lucide-react';
import { Button, Input, Avatar, Toggle } from './ui';
import { useAuth } from '../context/AuthContext';
import * as userService from '../services/userService';
import * as authService from '../services/authService';
import toast from 'react-hot-toast';

const TABS = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'appearance', label: 'Appearance', icon: Monitor },
    { id: 'privacy', label: 'Privacy', icon: Lock },
];

export default function SettingsModal({ isOpen, onClose, initialTab = 'profile' }) {
    const { user, refreshUser } = useAuth();
    const [activeTab, setActiveTab] = useState(initialTab);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen && initialTab) {
            setActiveTab(initialTab);
        }
        if (!isOpen) {
            setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
        }
    }, [isOpen, initialTab]);

    const [formData, setFormData] = useState({
        notifications: {
            email: true,
            desktop: true,
            sound: true,
            mentions: true
        },
        appearance: {
            theme: 'dark',
            fontScale: 100
        }
    });

    const [profileData, setProfileData] = useState({
        name: '',
        avatar: ''
    });

    const [passwordData, setPasswordData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });

    const normalizeFontScale = (value) => {
        const raw = String(value ?? '').trim().replace('%', '');
        const numeric = Number(raw);
        const allowed = [90, 100, 115, 125];
        return allowed.includes(numeric) ? numeric : 100;
    };

    useEffect(() => {
        if (user?.settings) {
            setFormData(prev => ({
                notifications: { ...prev.notifications, ...user.settings.notifications },
                appearance: {
                    ...prev.appearance,
                    ...user.settings.appearance,
                    fontScale: normalizeFontScale(user.settings.appearance?.fontScale)
                }
            }));
        }
        if (user) {
            setProfileData({
                name: user.name || '',
                avatar: user.avatar || ''
            });
        }
    }, [user]);

    const handleToggle = async (category, setting) => {
        const nextValue = !formData[category][setting];
        if (category === 'notifications' && setting === 'desktop' && nextValue && 'Notification' in window) {
            if (Notification.permission === 'default') {
                try {
                    await Notification.requestPermission();
                } catch {
                    toast.error('Notification permission was blocked');
                }
            }
        }

        setFormData(prev => ({
            ...prev,
            [category]: {
                ...prev[category],
                [setting]: nextValue
            }
        }));
    };

    const handleSelect = (category, setting, value) => {
        setFormData(prev => ({
            ...prev,
            [category]: {
                ...prev[category],
                [setting]: value
            }
        }));
    }

    const handleSave = async () => {
        setLoading(true);
        try {
            await userService.updateSettings(formData);
            await userService.updateProfile({
                name: profileData.name,
                avatar: profileData.avatar
            });
            toast.success('Settings saved');
            await refreshUser();
            onClose();
        } catch (err) {
            toast.error(err.message || 'Failed to save');
        } finally {
            setLoading(false);
        }
    };

    const handlePasswordChange = async () => {
        if (!passwordData.currentPassword || !passwordData.newPassword) {
            toast.error('Please fill in all password fields');
            return;
        }
        if (passwordData.newPassword !== passwordData.confirmPassword) {
            toast.error('New passwords do not match');
            return;
        }
        try {
            await userService.changePassword({
                currentPassword: passwordData.currentPassword,
                newPassword: passwordData.newPassword
            });
            setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
            toast.success('Password updated');
        } catch (err) {
            toast.error(err.message || 'Failed to update password');
        }
    };

    const handleResendVerification = async () => {
        try {
            await authService.sendOtp();
            toast.success('Verification code sent');
        } catch (err) {
            toast.error(err.message || 'Failed to send code');
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 z-[60] bg-black/30 backdrop-blur-sm"
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.98, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.98, y: 10 }}
                        className="fixed inset-0 z-[70] flex items-center justify-center p-6 pointer-events-none"
                    >
                        <div className="flex h-[75vh] w-full max-w-4xl overflow-hidden rounded-3xl border border-border bg-card shadow-2xl pointer-events-auto">
                            {/* Sidebar */}
                            <div className="flex w-64 flex-col border-r border-border bg-secondary/10 p-5">
                                <h2 className="mb-5 px-2 text-xl font-semibold tracking-tight text-foreground">Settings</h2>
                                <div className="space-y-1 flex-1">
                                    {TABS.map(tab => (
                                        <button
                                            key={tab.id}
                                            onClick={() => setActiveTab(tab.id)}
                                            className={`w-full flex items-center gap-3 rounded-xl px-3 py-2 text-[13px] font-medium transition-all
                        ${activeTab === tab.id
                                                    ? 'border border-border bg-background text-foreground shadow-sm'
                                                    : 'text-muted-foreground hover:bg-accent/10 hover:text-foreground'
                                                }`}
                                        >
                                            <tab.icon size={18} strokeWidth={activeTab === tab.id ? 2.5 : 2} />
                                            {tab.label}
                                        </button>
                                    ))}
                                </div>

                                <div className="mt-auto px-2">
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">TeamPulse v1.0.0</p>
                                </div>
                            </div>

                            {/* Content */}
                            <div className="flex flex-1 flex-col bg-card">
                                <div className="flex items-center justify-between border-b border-border px-7 py-5">
                                    <div>
                                        <h3 className="text-lg font-semibold tracking-tight text-foreground">
                                            {TABS.find(t => t.id === activeTab)?.label}
                                        </h3>
                                        <p className="text-xs text-muted-foreground">Configure your {activeTab.toLowerCase()} experience</p>
                                    </div>
                                    <button onClick={onClose} className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-accent/20 hover:text-foreground">
                                        <X size={20} strokeWidth={2} />
                                    </button>
                                </div>

                                <div className="custom-scrollbar flex-1 overflow-y-auto p-7">
                                    <motion.div
                                        key={activeTab}
                                        initial={{ opacity: 0, y: 4 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.2 }}
                                    >
                                        {activeTab === 'profile' && (
                                            <div className="space-y-8 max-w-md">
                                                <div className="flex items-center gap-6">
                                                    <Avatar
                                                        name={profileData.name || user.name}
                                                        src={profileData.avatar || user.avatar}
                                                        size="xl"
                                                        className="h-24 w-24 shadow-xl shadow-black/40"
                                                    />
                                                    <div className="space-y-2">
                                                        <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-600">Paste an image URL to update your avatar.</p>
                                                    </div>
                                                </div>
                                                <div className="space-y-4">
                                                    <Input
                                                        label="Display Name"
                                                        value={profileData.name}
                                                        onChange={(e) => setProfileData(prev => ({ ...prev, name: e.target.value }))}
                                                    />
                                                    <Input
                                                        label="Avatar URL"
                                                        value={profileData.avatar}
                                                        onChange={(e) => setProfileData(prev => ({ ...prev, avatar: e.target.value }))}
                                                        placeholder="https://..."
                                                    />
                                                    <Input label="Email Address" defaultValue={user.email} disabled />
                                                    <Input label="Username" defaultValue={`@${user.username || 'unset'}`} disabled />
                                                </div>
                                            </div>
                                        )}

                                        {activeTab === 'notifications' && (
                                            <div className="space-y-6 max-w-lg">
                                                <div className="overflow-hidden rounded-2xl border border-border bg-secondary/10">
                                                    {[
                                                        { id: 'email', label: 'Email Notifications', desc: 'Summary of activity sent to your inbox' },
                                                        { id: 'desktop', label: 'Desktop Notifications', desc: 'Real-time alerts via your browser' },
                                                        { id: 'sound', label: 'Notification Sounds', desc: 'Play a sound for every new message' },
                                                        { id: 'mentions', label: 'Mentions', desc: 'Notify when you are mentioned' },
                                                    ].map((item, idx, arr) => (
                                                        <div key={item.id} className={`flex items-center justify-between p-5 transition-all ${idx !== arr.length - 1 ? 'border-b border-border' : ''}`}>
                                                            <div className="pr-8">
                                                                <p className="mb-1.5 text-sm font-semibold leading-none text-foreground">{item.label}</p>
                                                                <p className="text-[11px] font-medium leading-relaxed text-muted-foreground">{item.desc}</p>
                                                            </div>
                                                            <Toggle
                                                                checked={formData.notifications[item.id]}
                                                                onChange={() => handleToggle('notifications', item.id)}
                                                            />
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {activeTab === 'appearance' && (
                                            <div className="space-y-8">
                                                <div className="grid grid-cols-3 gap-4">
                                                    {[
                                                        { id: 'light', label: 'Light', icon: Sun },
                                                        { id: 'dark', label: 'Dark', icon: Moon },
                                                        { id: 'system', label: 'System', icon: MonitorSmartphone },
                                                    ].map(theme => (
                                                        <button
                                                            key={theme.id}
                                                            onClick={() => handleSelect('appearance', 'theme', theme.id)}
                                                            className={`flex flex-col items-center gap-3 rounded-2xl border p-5 transition-all
                                ${formData.appearance.theme === theme.id
                                                                    ? 'border-primary/30 bg-primary/5 shadow-sm scale-[1.02]'
                                                                    : 'border-border bg-secondary/10 hover:border-accent/50'
                                                                }`}
                                                        >
                                                            <div className={`rounded-xl p-3 ${formData.appearance.theme === theme.id ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'}`}>
                                                                <theme.icon size={24} strokeWidth={2} />
                                                            </div>
                                                            <span className="text-xs font-bold tracking-tight text-foreground">{theme.label}</span>
                                                        </button>
                                                    ))}
                                                </div>

                                                <div className="rounded-2xl border border-border bg-secondary/10 p-5">
                                                    <div className="flex items-center justify-between mb-3">
                                                        <div>
                                                            <p className="text-sm font-semibold text-foreground">Text Size</p>
                                                            <p className="text-[11px] font-medium text-muted-foreground">Only affects message and content text, not the overall UI layout.</p>
                                                        </div>
                                                        <span className="text-[11px] font-bold text-muted-foreground">{normalizeFontScale(formData.appearance.fontScale)}</span>
                                                    </div>
                                                    <div className="grid grid-cols-4 gap-2">
                                                        {[90, 100, 115, 125].map((size) => (
                                                            <button
                                                                key={size}
                                                                type="button"
                                                                onClick={() => handleSelect('appearance', 'fontScale', size)}
                                                                className={`rounded-md border px-2 py-1.5 text-xs font-semibold transition-colors ${
                                                                    normalizeFontScale(formData.appearance.fontScale) === size
                                                                        ? 'border-primary/40 bg-primary/10 text-foreground'
                                                                        : 'border-border bg-background/40 text-muted-foreground hover:bg-accent/20 hover:text-foreground'
                                                                }`}
                                                            >
                                                                {size}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {activeTab === 'privacy' && (
                                            <div className="space-y-8 max-w-lg">
                                                <div className="rounded-2xl border border-border bg-secondary/10 p-5">
                                                    <div className="flex items-center justify-between">
                                                        <div>
                                                            <p className="text-sm font-semibold text-foreground">Email Verification</p>
                                                            <p className="mt-1 text-[11px] font-medium text-muted-foreground">
                                                                {user?.isEmailVerified ? 'Your email is verified.' : 'Verify your email to unlock full access.'}
                                                            </p>
                                                        </div>
                                                        {!user?.isEmailVerified && (
                                                            <Button size="sm" variant="secondary" onClick={handleResendVerification}>
                                                                Send Code
                                                            </Button>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="space-y-4 rounded-2xl border border-border bg-secondary/10 p-5">
                                                    <div className="flex items-center gap-3">
                                                        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-secondary">
                                                            <Shield size={18} className="text-muted-foreground" />
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-semibold text-foreground">Change Password</p>
                                                            <p className="text-[11px] font-medium text-muted-foreground">Local accounts only</p>
                                                        </div>
                                                    </div>

                                                    {user?.authProvider !== 'local' ? (
                                                        <p className="text-xs font-medium text-muted-foreground">
                                                            Password changes are managed by your identity provider.
                                                        </p>
                                                    ) : (
                                                        <div className="space-y-3">
                                                            <Input
                                                                label="Current Password"
                                                                type="password"
                                                                value={passwordData.currentPassword}
                                                                onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                                                            />
                                                            <Input
                                                                label="New Password"
                                                                type="password"
                                                                value={passwordData.newPassword}
                                                                onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                                                            />
                                                            <Input
                                                                label="Confirm New Password"
                                                                type="password"
                                                                value={passwordData.confirmPassword}
                                                                onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                                                            />
                                                            <div className="flex justify-end">
                                                                <Button size="sm" onClick={handlePasswordChange}>Update Password</Button>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </motion.div>
                                </div>

                                {/* Footer */}
                                <div className="flex justify-end gap-3 border-t border-border bg-background/80 px-7 py-4">
                                    <Button variant="ghost" size="sm" onClick={onClose}>Discard</Button>
                                    <Button size="sm" onClick={handleSave} loading={loading}>
                                        Save Changes
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
