import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Users, Shield, Crown } from 'lucide-react';
import { Button, Avatar } from './ui';
import { getChannelMembers } from '../services/managementService';
import toast from 'react-hot-toast';

export default function ChannelMembersModal({ isOpen, onClose, channelId, channelName }) {
    const [members, setMembers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isPrivate, setIsPrivate] = useState(false);

    useEffect(() => {
        if (!isOpen || !channelId) return;

        setLoading(true);
        getChannelMembers(channelId)
            .then((data) => {
                if (data.success) {
                    setMembers(data.members || []);
                    setIsPrivate(data.isPrivate || false);
                }
            })
            .catch((err) => {
                toast.error(err.message || 'Failed to load members');
            })
            .finally(() => {
                setLoading(false);
            });
    }, [isOpen, channelId]);

    const getRoleIcon = (member) => {
        if (member.isOwner) return <Crown size={14} className="text-amber-500" />;
        if (member.role === 'admin') return <Shield size={14} className="text-blue-500" />;
        return null;
    };

    const getRoleBadge = (member) => {
        if (member.isOwner) return 'Owner';
        if (member.role === 'admin') return 'Admin';
        if (member.role === 'guest') return 'Guest';
        return 'Member';
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
                        className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm"
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.98, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.98, y: 10 }}
                        className="fixed inset-0 z-[70] flex items-center justify-center p-6 pointer-events-none"
                    >
                        <div className="w-full max-w-md overflow-hidden rounded-[2rem] border border-border bg-card shadow-2xl shadow-black/40 pointer-events-auto">
                            {/* Header */}
                            <div className="flex items-center justify-between border-b border-border px-6 py-5">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                                        <Users size={20} strokeWidth={2.5} />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-semibold tracking-tight text-foreground">Channel Members</h3>
                                        <p className="text-xs font-medium text-muted-foreground">
                                            {channelName} {isPrivate && '• Private'}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={onClose}
                                    className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-accent/20 hover:text-foreground"
                                >
                                    <X size={20} strokeWidth={2.5} />
                                </button>
                            </div>

                            {/* Members List */}
                            <div className="max-h-[60vh] overflow-y-auto p-4 custom-scrollbar">
                                {loading ? (
                                    <div className="flex items-center justify-center py-12">
                                        <div className="h-8 w-8 animate-spin rounded-full border-2 border-foreground/30 border-t-foreground" />
                                    </div>
                                ) : members.length === 0 ? (
                                    <div className="text-center py-12">
                                        <p className="text-sm font-medium text-muted-foreground">No members found</p>
                                    </div>
                                ) : (
                                    <div className="space-y-1">
                                        {members.map((member) => (
                                            <div
                                                key={member._id}
                                                className="group flex items-center justify-between rounded-xl p-3 transition-colors hover:bg-accent/10"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <Avatar
                                                        name={member.name}
                                                        src={member.avatar}
                                                        size="md"
                                                        className="border border-border shadow-sm"
                                                    />
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <p className="text-sm font-semibold leading-none text-foreground transition-colors group-hover:text-foreground">
                                                                {member.name}
                                                            </p>
                                                            {getRoleIcon(member)}
                                                        </div>
                                                        <p className="mt-1 text-[11px] font-medium text-muted-foreground">
                                                            @{member.username || 'no-username'}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="rounded-lg border border-border bg-secondary px-2.5 py-1">
                                                    <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                                                        {getRoleBadge(member)}
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Footer */}
                            <div className="border-t border-border bg-secondary/10 px-6 py-4">
                                <Button variant="ghost" size="sm" onClick={onClose} className="w-full">
                                    Close
                                </Button>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
