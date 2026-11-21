import React, { useCallback, useEffect, useState } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  type User,
} from 'firebase/auth';
import {
  Cloud,
  CloudUpload,
  FolderOpen,
  Loader2,
  LogOut,
  Mail,
  Lock,
  Trash2,
  X,
  Check,
  AlertCircle,
  Clock,
} from 'lucide-react';
import { auth, googleProvider } from '../firebase';
import { TranslationKey } from '../i18n/translations';
import {
  type CloudProjectMetaRecord,
  type CloudProjectRecord,
  deleteCloudProject,
  ensureUserProfile,
  listCloudProjectMetas,
  loadCloudProjectPayload,
  MAX_CLOUD_PROJECTS_PER_USER,
} from '../services/cloudProjects';
import { trackFunction, trackWindowClose, trackWindowOpen } from '../utils/analytics';

interface CloudSaveModalProps {
  t: (key: TranslationKey) => string;
  user: User | null;
  dontShowTutorialAgain: boolean;
  onSyncTutorialPrefFromCloud: (hide: boolean) => void;
  activeProjectId: string | null;
  activeProjectTitle: string;
  onSaveProjectToCloud: (
    user: User,
    options: { projectId?: string; title: string }
  ) => Promise<string>;
  onLoadCloudProject: (project: CloudProjectRecord) => void;
  onActiveProjectDeleted: (projectId: string) => void;
  onClose: () => void;
  isDarkBg: boolean;
}

function buildDefaultProjectTitle(): string {
  const now = new Date();
  const dd = String(now.getDate()).padStart(2, '0');
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const hh = String(now.getHours()).padStart(2, '0');
  const min = String(now.getMinutes()).padStart(2, '0');
  return `ZenPainter ${dd}.${mm} ${hh}:${min}`;
}

function mapFirebaseAuthError(err: unknown, t: (key: TranslationKey) => string): string {
  const code =
    typeof err === 'object' && err !== null && 'code' in err
      ? String((err as { code?: unknown }).code || '')
      : '';

  switch (code) {
    case 'auth/operation-not-allowed':
      return t('cloudErrOperationNotAllowed');
    case 'auth/email-already-in-use':
      return t('cloudErrEmailInUse');
    case 'auth/invalid-email':
      return t('cloudErrInvalidEmail');
    case 'auth/weak-password':
      return t('cloudErrWeakPassword');
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return t('cloudErrInvalidCredential');
    case 'auth/too-many-requests':
      return t('cloudErrTooManyRequests');
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
      return t('cloudErrPopupClosed');
    case 'auth/network-request-failed':
      return t('cloudErrNetwork');
    default:
      return err instanceof Error && err.message
        ? err.message
        : t('cloudErrGeneric');
  }
}

function getDaysRemaining(expiresAtMs: number): number {
  const diff = Math.max(0, expiresAtMs - Date.now());
  return Math.max(1, Math.ceil(diff / (24 * 60 * 60 * 1000)));
}

export const CloudSaveModal: React.FC<CloudSaveModalProps> = ({
  t,
  user,
  dontShowTutorialAgain,
  onSyncTutorialPrefFromCloud,
  activeProjectId,
  activeProjectTitle,
  onSaveProjectToCloud,
  onLoadCloudProject,
  onActiveProjectDeleted,
  onClose,
  isDarkBg,
}) => {
  const [authMode, setAuthMode] = useState<'register' | 'login'>('register');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const [titleDraft, setTitleDraft] = useState(
    () => activeProjectTitle || buildDefaultProjectTitle()
  );
  const [projects, setProjects] = useState<CloudProjectMetaRecord[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [statusSuccess, setStatusSuccess] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  useEffect(() => {
    trackWindowOpen('cloud_save_modal', { signed_in: Boolean(user) });
    return () => {
      trackWindowClose('cloud_save_modal');
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refreshProjects = useCallback(async (uid: string) => {
    setLoadingList(true);
    setStatusError(null);
    try {
      const list = await listCloudProjectMetas(uid);
      setProjects(list);
    } catch {
      setStatusError(t('cloudErrGeneric'));
    } finally {
      setLoadingList(false);
    }
  }, [t]);

  useEffect(() => {
    if (user) {
      void refreshProjects(user.uid);
    } else {
      setProjects([]);
    }
  }, [user, refreshProjects]);

  const handleSave = async (
    targetUser: User,
    overwriteExisting: boolean
  ): Promise<boolean> => {
    setSaving(true);
    setStatusError(null);
    setStatusSuccess(null);
    try {
      const resolvedTitle = titleDraft.trim() || buildDefaultProjectTitle();
      setTitleDraft(resolvedTitle);
      const profile = await ensureUserProfile(targetUser, dontShowTutorialAgain);
      onSyncTutorialPrefFromCloud(profile.hideWelcomeTutorial);
      await onSaveProjectToCloud(targetUser, {
        projectId: overwriteExisting && activeProjectId ? activeProjectId : undefined,
        title: resolvedTitle,
      });
      await refreshProjects(targetUser.uid);
      setStatusSuccess(t('cloudSavedToast'));
      trackFunction('cloud_project_saved', 'cloud', {
        overwrite: overwriteExisting && Boolean(activeProjectId),
      });
      return true;
    } catch (err) {
      if (err instanceof Error && err.message === 'MAX_PROJECTS_REACHED') {
        setStatusError(t('cloudMaxProjectsReached'));
      } else if (err instanceof Error && err.message === 'PROJECT_TOO_LARGE') {
        setStatusError(t('cloudErrTooLarge'));
      } else {
        setStatusError(t('cloudErrGeneric'));
      }
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleEmailAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedEmail = email.trim();
    if (!trimmedEmail || password.length < 6) {
      setAuthError(t('cloudErrValidation'));
      return;
    }

    setAuthBusy(true);
    setAuthError(null);
    try {
      const cred =
        authMode === 'register'
          ? await createUserWithEmailAndPassword(auth, trimmedEmail, password)
          : await signInWithEmailAndPassword(auth, trimmedEmail, password);

      trackFunction(
        authMode === 'register' ? 'cloud_register_email' : 'cloud_login_email',
        'cloud'
      );

      const profile = await ensureUserProfile(cred.user, dontShowTutorialAgain);
      onSyncTutorialPrefFromCloud(profile.hideWelcomeTutorial);

      if (authMode === 'register') {
        await handleSave(cred.user, false);
      } else {
        await refreshProjects(cred.user.uid);
      }
    } catch (err) {
      setAuthError(mapFirebaseAuthError(err, t));
    } finally {
      setAuthBusy(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setAuthBusy(true);
    setAuthError(null);
    try {
      const cred = await signInWithPopup(auth, googleProvider);
      trackFunction('cloud_login_google', 'cloud');
      const profile = await ensureUserProfile(cred.user, dontShowTutorialAgain);
      onSyncTutorialPrefFromCloud(profile.hideWelcomeTutorial);
      const metas = await listCloudProjectMetas(cred.user.uid);
      setProjects(metas);
      if (metas.length < MAX_CLOUD_PROJECTS_PER_USER) {
        await handleSave(cred.user, false);
      }
    } catch (err) {
      setAuthError(mapFirebaseAuthError(err, t));
    } finally {
      setAuthBusy(false);
    }
  };

  const handleOpenProject = async (meta: CloudProjectMetaRecord) => {
    setOpeningId(meta.id);
    setStatusError(null);
    try {
      const fullProject = await loadCloudProjectPayload(meta.id);
      if (!fullProject) {
        if (user) {
          await refreshProjects(user.uid);
        }
        setStatusError(t('cloudErrGeneric'));
        return;
      }
      onLoadCloudProject(fullProject);
      trackFunction('cloud_project_loaded', 'cloud');
    } catch {
      setStatusError(t('cloudErrGeneric'));
    } finally {
      setOpeningId(null);
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    setStatusError(null);
    try {
      await deleteCloudProject(projectId);
      setProjects((prev) => prev.filter((p) => p.id !== projectId));
      setConfirmDeleteId(null);
      onActiveProjectDeleted(projectId);
      setStatusSuccess(t('cloudDeletedToast'));
      trackFunction('cloud_project_deleted', 'cloud');
    } catch {
      setStatusError(t('cloudErrGeneric'));
    }
  };

  const handleSignOut = async () => {
    await signOut(auth);
    setProjects([]);
    setStatusSuccess(null);
    setStatusError(null);
    trackFunction('cloud_sign_out', 'cloud');
  };

  const slotsReached = projects.length >= MAX_CLOUD_PROJECTS_PER_USER;

  const surface = isDarkBg
    ? 'bg-neutral-900 border-neutral-700 text-neutral-100'
    : 'bg-white border-slate-200 text-slate-900';
  const mutedText = isDarkBg ? 'text-neutral-400' : 'text-slate-500';
  const cardBg = isDarkBg
    ? 'bg-neutral-800/70 border-neutral-700/80'
    : 'bg-slate-50/90 border-slate-200/80';
  const inputStyle = isDarkBg
    ? 'bg-neutral-900 border-neutral-700 text-neutral-100 placeholder:text-neutral-500'
    : 'bg-white border-slate-200 text-slate-900 placeholder:text-slate-400';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm"
      onClick={onClose}
      onPointerDown={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-md max-h-[calc(100dvh-32px)] rounded-2xl border shadow-2xl flex flex-col overflow-hidden ${surface}`}
      >
        {/* Header */}
        <div
          className={`px-5 py-4 border-b flex items-center justify-between gap-3 ${
            isDarkBg ? 'border-neutral-800' : 'border-slate-100'
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-blue-600/15 text-blue-600 flex items-center justify-center shrink-0">
              <Cloud className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-semibold truncate">{t('cloudTitle')}</div>
              {user && (
                <div className={`text-[11px] truncate ${mutedText}`}>
                  {user.email || user.displayName}
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {user && (
              <button
                type="button"
                onClick={handleSignOut}
                title={t('cloudSignOutBtn')}
                aria-label={t('cloudSignOutBtn')}
                className={`min-h-[34px] px-2.5 rounded-lg text-[11px] font-medium flex items-center gap-1 cursor-pointer transition-colors ${
                  isDarkBg
                    ? 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                }`}
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{t('cloudSignOutBtn')}</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label={t('closeLabel')}
              className={`w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer transition-colors ${
                isDarkBg
                  ? 'hover:bg-neutral-800 text-neutral-400'
                  : 'hover:bg-slate-100 text-slate-500'
              }`}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 min-h-0 bp-scroll overflow-y-auto p-5 space-y-4">
          {!user ? (
            <>
              <div className={`p-3.5 rounded-xl border text-xs leading-relaxed font-medium ${cardBg}`}>
                {t('cloudAuthPrompt')}
              </div>

              <div className="p-3 rounded-xl bg-orange-600 border border-orange-500 text-white text-[11px] font-medium flex items-start gap-2 leading-snug shadow-sm">
                <Clock className="w-4 h-4 shrink-0 mt-0.5 text-white" />
                <span>{t('cloudQuotaNotice')}</span>
              </div>

              <form onSubmit={handleEmailAuthSubmit} className="space-y-3">
                <div className="space-y-2">
                  <div className="relative">
                    <Mail className={`w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 ${mutedText}`} />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder={t('cloudEmailPlaceholder')}
                      autoComplete="email"
                      className={`w-full min-h-[44px] pl-9 pr-3 rounded-xl border text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 ${inputStyle}`}
                    />
                  </div>
                  <div className="relative">
                    <Lock className={`w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 ${mutedText}`} />
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={t('cloudPasswordPlaceholder')}
                      autoComplete={authMode === 'register' ? 'new-password' : 'current-password'}
                      className={`w-full min-h-[44px] pl-9 pr-3 rounded-xl border text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 ${inputStyle}`}
                    />
                  </div>
                </div>

                {authError && (
                  <div
                    className={`p-2.5 rounded-xl border text-[11px] flex items-start gap-2 leading-snug ${
                      isDarkBg
                        ? 'bg-red-500/15 border-red-500/40 text-red-300'
                        : 'bg-red-50 border-red-200 text-red-700'
                    }`}
                  >
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{authError}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={authBusy}
                  className="w-full min-h-[44px] px-4 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-sm"
                >
                  {authBusy ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <CloudUpload className="w-4 h-4" />
                  )}
                  <span>
                    {authMode === 'register'
                      ? t('cloudRegisterAndSave')
                      : t('cloudLoginAndSave')}
                  </span>
                </button>
              </form>

              <div className="flex items-center justify-center">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode((m) => (m === 'register' ? 'login' : 'register'));
                    setAuthError(null);
                  }}
                  className="text-[11px] font-medium text-blue-600 hover:underline cursor-pointer"
                >
                  {authMode === 'register'
                    ? t('cloudSwitchToLogin')
                    : t('cloudSwitchToRegister')}
                </button>
              </div>

              <div className="relative flex items-center py-1">
                <div className={`flex-grow border-t ${isDarkBg ? 'border-neutral-800' : 'border-slate-200'}`} />
                <span className={`px-3 text-[11px] uppercase tracking-wider ${mutedText}`}>
                  {t('cloudOrDivider')}
                </span>
                <div className={`flex-grow border-t ${isDarkBg ? 'border-neutral-800' : 'border-slate-200'}`} />
              </div>

              <button
                type="button"
                disabled={authBusy}
                onClick={handleGoogleSignIn}
                className={`w-full min-h-[42px] px-4 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer ${
                  isDarkBg
                    ? 'bg-neutral-800 hover:bg-neutral-700 border-neutral-700 text-neutral-100'
                    : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-800'
                }`}
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                <span>{t('cloudSignInGoogle')}</span>
              </button>
            </>
          ) : (
            <>
              {/* Retention & Slot Limit Banner */}
              <div className="p-3 rounded-xl bg-orange-600 border border-orange-500 text-white text-[11px] font-medium space-y-1.5 leading-snug shadow-sm">
                <div className="flex items-start gap-2">
                  <Clock className="w-4 h-4 shrink-0 mt-0.5 text-white" />
                  <span>{t('cloudQuotaNotice')}</span>
                </div>
                <div className="text-white/95 pl-6">{t('cloudAutoSaveNotice')}</div>
                <div className="flex items-center justify-between pt-0.5 font-semibold text-white">
                  <span>{t('cloudQuotaCounter')}:</span>
                  <span className="tabular-nums">
                    {projects.length} / {MAX_CLOUD_PROJECTS_PER_USER}
                  </span>
                </div>
              </div>

              {/* Save current canvas */}
              <div className={`p-3.5 rounded-xl border space-y-3 ${cardBg}`}>
                <label className="block space-y-1.5">
                  <span className={`text-[11px] font-medium ${mutedText}`}>
                    {t('cloudProjectTitleLabel')}
                  </span>
                  <input
                    type="text"
                    maxLength={120}
                    value={titleDraft}
                    onChange={(e) => setTitleDraft(e.target.value)}
                    className={`w-full min-h-[40px] px-3 rounded-xl border text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 ${inputStyle}`}
                  />
                </label>

                {statusError && (
                  <div
                    className={`p-2.5 rounded-xl border text-[11px] flex items-start gap-2 ${
                      isDarkBg
                        ? 'bg-red-500/15 border-red-500/40 text-red-300'
                        : 'bg-red-50 border-red-200 text-red-700'
                    }`}
                  >
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{statusError}</span>
                  </div>
                )}

                {statusSuccess && (
                  <div
                    className={`p-2.5 rounded-xl border text-[11px] flex items-center gap-2 ${
                      isDarkBg
                        ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                        : 'bg-emerald-50 border-emerald-200 text-emerald-700'
                    }`}
                  >
                    <Check className="w-4 h-4 shrink-0" />
                    <span>{statusSuccess}</span>
                  </div>
                )}

                {activeProjectId ? (
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => void handleSave(user, true)}
                      className="min-h-[42px] px-3 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      {saving ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <CloudUpload className="w-4 h-4" />
                      )}
                      <span>{t('cloudUpdateCurrentBtn')}</span>
                    </button>
                    <button
                      type="button"
                      disabled={saving || slotsReached}
                      onClick={() => void handleSave(user, false)}
                      title={slotsReached ? t('cloudMaxProjectsReached') : undefined}
                      className={`min-h-[42px] px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                        isDarkBg
                          ? 'bg-neutral-700 hover:bg-neutral-600 text-neutral-100'
                          : 'bg-slate-200 hover:bg-slate-300 text-slate-800'
                      }`}
                    >
                      <span>{t('cloudSaveAsNewBtn')}</span>
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    disabled={saving || slotsReached}
                    onClick={() => void handleSave(user, false)}
                    className="w-full min-h-[44px] px-4 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-sm"
                  >
                    {saving ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <CloudUpload className="w-4 h-4" />
                    )}
                    <span>
                      {saving
                        ? t('cloudSavingLabel')
                        : slotsReached
                          ? t('cloudMaxProjectsReached')
                          : t('cloudSaveNewBtn')}
                    </span>
                  </button>
                )}
              </div>

              {/* Saved projects cards */}
              <div className="space-y-2">
                <div className={`text-xs font-semibold ${mutedText}`}>
                  {t('cloudSavedProjectsTitle')}
                </div>

                {loadingList ? (
                  <div className={`py-6 flex items-center justify-center gap-2 text-xs ${mutedText}`}>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{t('cloudLoadingLabel')}</span>
                  </div>
                ) : projects.length === 0 ? (
                  <div className={`p-4 rounded-xl border text-center text-xs ${cardBg} ${mutedText}`}>
                    {t('cloudEmptyProjects')}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {projects.map((proj) => {
                      const isCurrent = proj.id === activeProjectId;
                      const isOpening = openingId === proj.id;
                      const formattedDate = new Date(proj.updatedAtMs).toLocaleString(undefined, {
                        day: '2-digit',
                        month: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      });
                      const kb = Math.max(1, Math.round(proj.approxBytes / 1024));
                      const daysLeft = getDaysRemaining(proj.expiresAtMs);

                      return (
                        <div
                          key={proj.id}
                          className={`p-3 rounded-xl border flex items-center justify-between gap-2 ${
                            isCurrent
                              ? isDarkBg
                                ? 'bg-blue-500/15 border-blue-500/40'
                                : 'bg-blue-50 border-blue-200'
                              : cardBg
                          }`}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-semibold truncate">{proj.title}</div>
                            <div className={`text-[10px] mt-0.5 ${mutedText}`}>
                              {formattedDate} • {proj.objectCount} {t('cloudObjectsCount')} • ~{kb}{' '}
                              {t('cloudKbUnit')} • {daysLeft} {t('cloudDaysLeft')}
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              disabled={Boolean(openingId)}
                              onClick={() => void handleOpenProject(proj)}
                              className="min-h-[34px] px-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                            >
                              {isOpening ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <FolderOpen className="w-3.5 h-3.5" />
                              )}
                              <span>{t('cloudOpenBtn')}</span>
                            </button>
                            {confirmDeleteId === proj.id ? (
                              <button
                                type="button"
                                onClick={() => void handleDeleteProject(proj.id)}
                                className="min-h-[34px] px-2.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-[11px] font-semibold cursor-pointer transition-colors"
                              >
                                {t('cloudDeleteConfirmBtn')}
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteId(proj.id)}
                                title={t('cloudDeleteBtn')}
                                aria-label={t('cloudDeleteBtn')}
                                className={`min-h-[34px] w-8 rounded-lg flex items-center justify-center cursor-pointer transition-colors ${
                                  isDarkBg
                                    ? 'bg-neutral-800 hover:bg-red-500/20 text-neutral-400 hover:text-red-400'
                                    : 'bg-white hover:bg-red-50 text-slate-500 hover:text-red-600'
                                }`}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
