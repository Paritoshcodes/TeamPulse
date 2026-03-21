import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import * as workspaceService from '../services/workspaceService.js';
import { Button, Input, Card } from '../components/ui';
import { Briefcase, Plus, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';

export default function WorkspaceSelector() {
  const [workspaces, setWorkspaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [name, setName] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    let cancelled = false;
    workspaceService.getMyWorkspaces()
      .then((data) => { if (!cancelled) setWorkspaces(data.workspaces || []); })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message);
          toast.error(err.message);
        }
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setError('');
    setCreating(true);
    try {
      const data = await workspaceService.createWorkspace(name.trim());
      setWorkspaces((prev) => [data.workspace, ...prev]);
      setName('');
      toast.success('Workspace created!');
    } catch (err) {
      const errorMsg = err.message || 'Failed to create workspace';
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="page-shell text-foreground">
      <div className="mx-auto max-w-3xl">
        {/* Header */}
        <div className="page-section-gap flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">Workspaces</h1>
            <p className="mt-1 text-sm text-muted-foreground">Create and manage where your teams collaborate.</p>
          </div>
          <Link to="/">
            <Button variant="ghost" size="sm">
              <ArrowRight className="mr-2 h-4 w-4" />
              Dashboard
            </Button>
          </Link>
        </div>

        {/* Error message */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground"
          >
            {error}
          </motion.div>
        )}

        {/* Create workspace form */}
        <Card className="mb-6 border border-border bg-card p-6 shadow-subtle">
          <h2 className="mb-4 text-lg font-semibold tracking-tight text-foreground">
            Create New Workspace
          </h2>
          <form onSubmit={handleCreate} className="flex gap-3">
            <Input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Workspace name"
              className="flex-1"
            />
            <Button
              type="submit"
              variant="primary"
              loading={creating}
            >
              <Plus className="mr-2 h-4 w-4" />
              Create
            </Button>
          </form>
        </Card>

        {/* Workspaces list */}
        <Card className="border border-border bg-card p-6 shadow-subtle">
          <h2 className="mb-4 text-lg font-semibold tracking-tight text-foreground">
            Your Workspaces
          </h2>

          {loading ? (
            <div className="text-center py-8">
              <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-solid border-foreground/30 border-t-foreground" />
              <p className="mt-2 text-meta">Loading workspaces...</p>
            </div>
          ) : workspaces.length === 0 ? (
            <div className="text-center py-12">
              <Briefcase className="mx-auto mb-3 h-12 w-12 text-muted-foreground" />
              <p className="text-body text-muted">No workspaces yet. Create one above.</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {workspaces.map((w, index) => (
                <motion.div
                  key={w._id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card
                    hover
                    className="flex items-center justify-between rounded-xl border border-border bg-secondary/10 p-4"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-secondary/40">
                        <Briefcase className="h-5 w-5 text-foreground" />
                      </div>
                      <div>
                        <h3 className="text-body font-medium">{w.name}</h3>
                        <p className="text-meta">{w.slug}</p>
                      </div>
                    </div>
                    <ArrowRight className="h-5 w-5 text-muted-foreground" />
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
