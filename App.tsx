/**
 * Rekenmachine plugin UI: a full-screen calculator. Past calculations go on a tape
 * shown on demand over everything, and can be inserted into the open note.
 *
 * @format
 */

import React, {useEffect, useRef, useState} from 'react';
import {
  I18nManager,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {PluginManager} from 'sn-plugin-lib';
import {BUTTON_NOTE} from './src/buttons';
import {
  CalcState,
  clearTape,
  copyTexts,
  display,
  newCalc,
  pickedTexts,
  pressKey,
  setMode,
} from './src/calculator';
import {HELP} from './src/help';
import {insertIntoNote} from './src/insertText';
import {getDecimalSign, setLanguage} from './src/math';

// Outside React so mode, settings and tape survive closing the plugin:
// the JS runtime keeps running until PluginHost restarts.
let saved: CalcState = newCalc();

// The device language decides the decimal sign; registerLangListener only reports later changes.
try {
  setLanguage(I18nManager.getConstants().localeIdentifier ?? '');
} catch {
  // No locale available: keep the default decimal comma.
}

/** Help text with the device's decimal sign in its example numbers (written with a comma). */
const localizeHelp = (text: string) =>
  text.replace(/(\d),(\d)/g, `$1${getDecimalSign()}$2`);

const BASIC_ROWS = [
  ['C', '⌫', '(', ')'],
  ['7', '8', '9', '÷'],
  ['4', '5', '6', '×'],
  ['1', '2', '3', '−'],
  ['±', '0', ',', '+'],
  ['Ans', '='],
];
const SCI_ROWS = [
  ['sin', 'cos', 'tan', 'log', 'ln'],
  ['sin⁻¹', 'cos⁻¹', 'tan⁻¹', '10ˣ', 'eˣ'],
  ['√', 'ⁿ√', 'x²', 'xʸ', '1/x'],
  ['n!', '%', 'π', 'e', '×10ⁿ'],
];
/** "Step" has no parentheses: those keys are left empty. */
const EXPRESSION_ONLY = ['(', ')'];

function App(): React.JSX.Element {
  const [calc, setCalc] = useState(saved);
  const [inNote, setInNote] = useState(false);
  const [overlay, setOverlay] = useState<'tape' | 'help' | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  /** Indices of the tape lines selected in the tape list. */
  const [picked, setPicked] = useState<ReadonlySet<number>>(new Set());
  const tapeRef = useRef<ScrollView>(null);
  /** Only there to re-render when the device language changes. */
  const [, setLanguageCode] = useState('');

  useEffect(() => {
    saved = calc;
  }, [calc]);

  useEffect(() => {
    const sub = PluginManager.registerLangListener({
      onMsg: (code: unknown) => {
        setLanguage(String(code));
        setLanguageCode(String(code));
      },
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    // The SDK replays a press that arrived just before this listener was registered.
    const sub = PluginManager.registerButtonListener({
      onButtonPress: event => {
        setInNote(event.id === BUTTON_NOTE);
        setOverlay(null);
        setMessage(null);
      },
    });
    return () => sub.remove();
  }, []);

  const press = (key: string) => setCalc(s => pressKey(s, key));
  const update = (change: Partial<CalcState>) =>
    setCalc(s => ({...s, ...change}));
  const close = () => {
    setOverlay(null);
    PluginManager.closePluginView();
  };
  const {top, main, approx} = display(calc);
  const texts = copyTexts(calc);
  const canInsert = inNote && texts !== null && !busy;
  const pickedText = pickedTexts(calc, picked);
  const canInsertPicked = inNote && pickedText !== null && !busy;
  const allPicked = calc.tape.length > 0 && picked.size === calc.tape.length;
  const sciKeys = calc.keys === 'sci';

  const togglePick = (i: number) =>
    setPicked(p => {
      const next = new Set(p);
      if (!next.delete(i)) {
        next.add(i);
      }
      return next;
    });
  const openTape = () => {
    setPicked(new Set());
    setOverlay('tape');
  };

  const insert = async (text: string) => {
    setBusy(true);
    setMessage(null);
    try {
      await insertIntoNote(text);
      close();
    } catch (e) {
      setMessage(`Insert failed: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  };

  const status = (
    <>
      {!inNote && <Text style={styles.hint}>Insert works only in a note.</Text>}
      {busy && <Text style={styles.hint}>Inserting…</Text>}
      {message && <Text style={styles.hint}>{message}</Text>}
    </>
  );

  return (
    <View style={styles.screen}>
      <View style={styles.topBar}>
        <View style={[styles.bar, styles.grow]}>
          <Toggle
            options={['Basic', 'Adv']}
            value={sciKeys ? 1 : 0}
            onChange={i => update({keys: i ? 'sci' : 'basic'})}
          />
          <Toggle
            options={['Expr', 'Step']}
            value={calc.mode === 'direct' ? 1 : 0}
            onChange={i => setCalc(s => setMode(s, i ? 'direct' : 'expr'))}
          />
          {sciKeys && (
            <>
              <Toggle
                options={['DEG', 'RAD']}
                value={calc.deg ? 0 : 1}
                onChange={i => update({deg: i === 0})}
              />
              <Toggle
                options={['NORM', 'SCI']}
                value={calc.sci ? 1 : 0}
                onChange={i => update({sci: i === 1})}
              />
            </>
          )}
        </View>
        <RoundButton
          label="?"
          accessibilityLabel="Help"
          onPress={() => setOverlay('help')}
        />
        <RoundButton label="✕" accessibilityLabel="Close" onPress={close} />
      </View>

      <View style={styles.bar}>
        <SmallButton label={`Tape (${calc.tape.length})`} onPress={openTape} />
        <Text style={styles.label}>Insert:</Text>
        <SmallButton
          label="Result"
          disabled={!canInsert}
          onPress={() => texts && insert(texts.result)}
        />
        <SmallButton
          label="Last calc"
          disabled={!canInsert}
          onPress={() => texts && insert(texts.last)}
        />
      </View>
      {status}

      <View style={styles.display}>
        <Text style={styles.displayTop} numberOfLines={2}>
          {top}
        </Text>
        <Text style={styles.displayMain} numberOfLines={1} adjustsFontSizeToFit>
          {main}
        </Text>
        {approx !== '' && <Text style={styles.displayApprox}>{approx}</Text>}
      </View>

      <View style={styles.keypad}>
        {(sciKeys ? [...SCI_ROWS, ...BASIC_ROWS] : BASIC_ROWS).map(row => (
          <View key={row.join()} style={styles.row}>
            {row.map(key =>
              calc.mode === 'direct' && EXPRESSION_ONLY.includes(key) ? (
                <View key={key} style={styles.keySpace} />
              ) : (
                <Pressable
                  key={key}
                  style={[styles.key, key === '=' && styles.keyWide]}
                  onPress={() => press(key)}>
                  <Text
                    style={[
                      styles.keyText,
                      SCI_ROWS.includes(row) && styles.keyTextSmall,
                    ]}>
                    {key === ',' ? getDecimalSign() : key}
                  </Text>
                </Pressable>
              ),
            )}
          </View>
        ))}
      </View>

      {overlay === 'tape' && (
        <Overlay title="Tape" onClose={() => setOverlay(null)}>
          <ScrollView
            ref={tapeRef}
            style={styles.tape}
            onContentSizeChange={() =>
              tapeRef.current?.scrollToEnd({animated: false})
            }>
            {calc.tape.length === 0 ? (
              <Text style={styles.hint}>No calculations yet.</Text>
            ) : (
              calc.tape.map((line, i) => (
                <Pressable
                  key={i}
                  style={styles.tapeRow}
                  onPress={() => togglePick(i)}>
                  <View
                    style={[styles.checkbox, picked.has(i) && styles.active]}
                  />
                  <Text style={styles.tapeLine}>{line.text}</Text>
                </Pressable>
              ))
            )}
          </ScrollView>
          <Text style={styles.hint}>
            {picked.size} selected. Tap a line to select it.
          </Text>
          <View style={styles.bar}>
            <SmallButton
              label={allPicked ? 'Select none' : 'Select all'}
              disabled={calc.tape.length === 0}
              onPress={() =>
                setPicked(
                  allPicked ? new Set() : new Set(calc.tape.map((_, i) => i)),
                )
              }
            />
            <Text style={styles.label}>Insert:</Text>
            <SmallButton
              label="Result"
              disabled={!canInsertPicked}
              onPress={() => pickedText && insert(pickedText.result)}
            />
            <SmallButton
              label="Calculation"
              disabled={!canInsertPicked}
              onPress={() => pickedText && insert(pickedText.calc)}
            />
            <SmallButton
              label="Clear tape"
              disabled={texts === null}
              onPress={() => {
                setPicked(new Set());
                setCalc(clearTape);
              }}
            />
          </View>
          {status}
        </Overlay>
      )}

      {overlay === 'help' && (
        <Overlay title="Help" onClose={() => setOverlay(null)}>
          <ScrollView style={styles.help}>
            {HELP.map(section => (
              <View key={section.title}>
                <Text style={styles.helpHeading}>{section.title}</Text>
                {section.items.map(([key, text]) => (
                  <View key={key} style={styles.helpRow}>
                    <Text style={styles.helpKey}>
                      {key === ',' ? getDecimalSign() : localizeHelp(key)}
                    </Text>
                    <Text style={styles.helpText}>{localizeHelp(text)}</Text>
                  </View>
                ))}
              </View>
            ))}
          </ScrollView>
        </Overlay>
      )}
    </View>
  );
}

/** Full-screen panel over the calculator, with a title and ✕. */
function Overlay({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <View style={styles.overlay}>
      <View style={styles.topBar}>
        <Text style={styles.title}>{title}</Text>
        <RoundButton label="✕" accessibilityLabel="Close" onPress={onClose} />
      </View>
      {children}
    </View>
  );
}

function Toggle({
  options,
  value,
  onChange,
}: {
  options: string[];
  value: number;
  onChange: (index: number) => void;
}): React.JSX.Element {
  return (
    <View style={styles.toggle}>
      {options.map((option, i) => (
        <Pressable
          key={option}
          style={[styles.toggleItem, i === value && styles.active]}
          onPress={() => onChange(i)}>
          <Text style={[styles.smallText, i === value && styles.activeText]}>
            {option}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

function SmallButton({
  label,
  onPress,
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}): React.JSX.Element {
  return (
    <Pressable
      style={[styles.smallButton, disabled && styles.disabled]}
      disabled={disabled}
      onPress={onPress}>
      <Text style={[styles.smallText, disabled && styles.disabledText]}>
        {label}
      </Text>
    </Pressable>
  );
}

function RoundButton({
  label,
  accessibilityLabel,
  onPress,
}: {
  label: string;
  accessibilityLabel: string;
  onPress: () => void;
}): React.JSX.Element {
  return (
    <Pressable
      style={styles.roundButton}
      onPress={onPress}
      accessibilityLabel={accessibilityLabel}>
      <Text style={styles.roundText}>{label}</Text>
    </Pressable>
  );
}

// E-ink: pure black on white, thick borders, no shadows or animations, large touch targets.
const styles = StyleSheet.create({
  screen: {
    flex: 1,
    padding: 16,
    backgroundColor: '#ffffff',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  // Only for a row inside topBar: as a direct child of the screen column, flex would take height from the keypad.
  grow: {
    flex: 1,
  },
  bar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    marginBottom: 4,
  },
  toggle: {
    flexDirection: 'row',
    marginRight: 6,
    marginBottom: 4,
    borderWidth: 2,
    borderColor: '#000000',
    borderRadius: 8,
    overflow: 'hidden',
  },
  toggleItem: {
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  active: {
    backgroundColor: '#000000',
  },
  activeText: {
    color: '#ffffff',
  },
  roundButton: {
    width: 34,
    height: 34,
    marginLeft: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#000000',
    borderRadius: 17,
  },
  roundText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000000',
  },
  smallButton: {
    marginRight: 6,
    marginBottom: 4,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderWidth: 2,
    borderColor: '#000000',
    borderRadius: 8,
  },
  disabled: {
    borderColor: '#b0b0b0',
  },
  disabledText: {
    color: '#b0b0b0',
  },
  smallText: {
    fontSize: 16,
    color: '#000000',
  },
  label: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000000',
    marginRight: 6,
    marginBottom: 4,
  },
  hint: {
    fontSize: 16,
    fontStyle: 'italic',
    color: '#000000',
    marginBottom: 4,
  },
  display: {
    borderWidth: 3,
    borderColor: '#000000',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 6,
    marginVertical: 6,
  },
  displayTop: {
    fontSize: 22,
    color: '#000000',
    textAlign: 'right',
    minHeight: 30,
  },
  displayMain: {
    fontSize: 44,
    fontWeight: '700',
    color: '#000000',
    textAlign: 'right',
  },
  displayApprox: {
    fontSize: 20,
    color: '#000000',
    textAlign: 'right',
  },
  keypad: {
    flex: 1,
  },
  row: {
    flex: 1,
    flexDirection: 'row',
  },
  key: {
    flex: 1,
    margin: 3,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#000000',
    borderRadius: 10,
  },
  keyWide: {
    flex: 3.1,
  },
  keySpace: {
    flex: 1,
    margin: 3,
  },
  keyText: {
    fontSize: 30,
    color: '#000000',
  },
  keyTextSmall: {
    fontSize: 22,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    padding: 16,
    backgroundColor: '#ffffff',
  },
  title: {
    flex: 1,
    fontSize: 28,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 8,
  },
  tape: {
    flex: 1,
    marginVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#000000',
  },
  tapeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  checkbox: {
    width: 24,
    height: 24,
    marginRight: 12,
    borderWidth: 2,
    borderColor: '#000000',
    borderRadius: 4,
  },
  tapeLine: {
    flex: 1,
    fontSize: 24,
    color: '#000000',
  },
  help: {
    flex: 1,
    marginTop: 8,
  },
  helpHeading: {
    fontSize: 22,
    fontWeight: '700',
    color: '#000000',
    marginTop: 16,
    marginBottom: 8,
  },
  helpRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  helpKey: {
    width: 150,
    marginRight: 12,
    paddingVertical: 2,
    borderWidth: 2,
    borderColor: '#000000',
    borderRadius: 8,
    fontSize: 18,
    color: '#000000',
    textAlign: 'center',
  },
  helpText: {
    flex: 1,
    fontSize: 18,
    color: '#000000',
  },
});

export default App;
