import {PluginCommAPI, PluginManager, PluginNoteAPI} from 'sn-plugin-lib';
import {FONT_SIZE, textBoxRect} from './textBox';

/** Shape of every PluginCommAPI/PluginNoteAPI result (the SDK does not export this type). */
type APIResponse<T> = {
  success: boolean;
  result: T | null;
  error: {code: number; message: string} | null;
};

const WRITE_PERMISSION = 'plugin.permission.FILE:WRITE';

async function ensureWritePermission(): Promise<void> {
  if ((await PluginManager.hasPermission(WRITE_PERMISSION)) === 1) {
    return;
  }
  const choice = await PluginManager.requestPermission(
    WRITE_PERMISSION,
    'Needed to put the result as a text box in your note.',
  );
  if (choice !== 1 && choice !== 2) {
    throw new Error('no write access to the note');
  }
}

/**
 * Inserts `text` as a text box in the middle of the current note page.
 * Several lines go in one box separated by \n (shown as separate lines on the Nomad).
 */
export async function insertIntoNote(text: string): Promise<void> {
  await ensureWritePermission();

  const size = (await PluginCommAPI.getPageDisplaySize()) as
    | APIResponse<{width: number; height: number}>
    | null
    | undefined;
  if (!size?.success || !size.result) {
    throw new Error(size?.error?.message ?? 'page size unknown');
  }

  const res = (await PluginNoteAPI.insertText({
    textContentFull: text,
    textRect: textBoxRect(text, size.result),
    fontSize: FONT_SIZE,
    textAlign: 0,
    textBold: 0,
    textItalics: 0,
    textFrameWidthType: 0,
    textFrameStyle: 0,
    textEditable: 0,
  })) as APIResponse<boolean> | null | undefined;
  if (!res?.success) {
    throw new Error(res?.error?.message ?? 'inserting the text box failed');
  }
}
