import { Download, Share, X } from 'lucide-react';
import { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { TranslationKey } from '../i18n/translations';

interface PWAInstallButtonProps {
  t: (key: TranslationKey) => string;
  isDarkBg?: boolean;
  fullWidth?: boolean;
}

export function PWAInstallButton({
  t,
  isDarkBg = false,
  fullWidth = false,
}: PWAInstallButtonProps) {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={install}
        className={`${fullWidth ? 'w-full' : ''} min-h-[44px] px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer ${
          isDarkBg
            ? 'bg-blue-600/20 hover:bg-blue-600/30 text-blue-300'
            : 'bg-blue-50 hover:bg-blue-100 text-blue-700'
        }`}
      >
        <Download className="w-4 h-4 shrink-0" />
        <span>{t('pwaInstallBtn')}</span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          className={`${fullWidth ? 'w-full' : ''} min-h-[44px] px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer ${
            isDarkBg
              ? 'bg-blue-600/20 hover:bg-blue-600/30 text-blue-300'
              : 'bg-blue-50 hover:bg-blue-100 text-blue-700'
          }`}
        >
          <Download className="w-4 h-4 shrink-0" />
          <span>{t('pwaIosBtn')}</span>
        </button>

        {showIOSGuide && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
            onClick={() => setShowIOSGuide(false)}
          >
            <div
              className="w-full max-w-sm rounded-2xl border border-white/10 bg-zinc-900 p-6 text-zinc-100 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between gap-4">
                <h2 className="text-base font-semibold">{t('pwaIosTitle')}</h2>
                <button
                  type="button"
                  onClick={() => setShowIOSGuide(false)}
                  aria-label={t('closeLabel')}
                  className="flex min-h-[40px] min-w-[40px] items-center justify-center rounded-lg text-zinc-400 hover:bg-white/10 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <ol className="mt-4 space-y-2.5 text-sm leading-relaxed text-zinc-300">
                <li className="flex items-start gap-2.5">
                  <span className="font-semibold text-blue-400">1.</span>
                  <span>
                    {t('pwaIosStep1Pre')}{' '}
                    <span className="inline-flex items-center gap-1 font-medium text-white">
                      {t('pwaIosStep1Share')} <Share className="h-3.5 w-3.5" />
                    </span>{' '}
                    {t('pwaIosStep1Post')}
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="font-semibold text-blue-400">2.</span>
                  <span>
                    {t('pwaIosStep2Pre')}{' '}
                    <strong className="font-medium text-white">{t('pwaIosStep2Home')}</strong>.
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="font-semibold text-blue-400">3.</span>
                  <span>{t('pwaIosStep3')}</span>
                </li>
              </ol>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
}
