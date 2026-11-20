export const APP_VERSION = '1.14';

export const APP_BUILD_ID: string =
  typeof __APP_BUILD_ID__ !== 'undefined' ? __APP_BUILD_ID__ : APP_VERSION;

export const HIDE_TUTORIAL_STORAGE_KEY = 'zenpainter_hide_welcome_tutorial';
