// Componentbibliotheek: React Native-vertaling van design system v2.0 (design-source/dist/styles.css + brand-v2.css).
// Maten, kleuren en typografie komen 1:1 uit de bron-CSS; zie src/theme.ts.
import { Image, type ImageSource } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import {
  ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View,
  type PressableProps, type StyleProp, type TextInputProps, type TextStyle, type ViewStyle,
} from 'react-native';
import Svg, { Circle, Rect } from 'react-native-svg';
import { avatars, colors, fonts, miniAvatars, shadow, taste } from '@/theme';

/** Tekstweergave forceren (geen emoji) voor de typografische iconen uit het ontwerp. */
export const glyph = (g: string) => `${g}︎`;

export function Logo({ size = 22 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48" accessibilityLabel="Plateful">
      <Rect width={48} height={48} rx={14} fill={colors.forest} />
      <Circle cx={24} cy={24} r={8.6} fill="#FFF7E8" />
      <Circle cx={24} cy={24} r={4.2} fill={colors.forest} />
      <Rect x={19} y={7.2} width={10} height={6.4} rx={3.2} fill="#FFF7E8" />
      <Rect x={7.2} y={19} width={6.4} height={10} rx={3.2} fill="#FFF7E8" />
      <Rect x={34.4} y={19} width={6.4} height={10} rx={3.2} fill="#FFF7E8" />
      <Rect x={19} y={34.4} width={10} height={6.4} rx={3.2} fill={colors.orange} />
    </Svg>
  );
}

export function Screen({ children }: { children: ReactNode }) {
  return <View style={s.appView}>{children}</View>;
}

export function AppHeader({ initials = '' }: { initials?: string }) {
  return (
    <View style={s.appHeader} accessibilityRole="header">
      <View style={s.appBrand}>
        <Logo />
        <Text style={s.appBrandText}>plateful<Text style={{ color: colors.orange }}>.</Text></Text>
      </View>
      {initials ? <View style={s.avatarSmall}><Text style={s.avatarSmallText}>{initials}</Text></View> : null}
    </View>
  );
}

export function SubHeader({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <View style={s.subHead}>
      <Pressable style={s.roundBack} onPress={onBack} accessibilityRole="button" accessibilityLabel="Terug" hitSlop={8}>
        <Text style={s.roundBackText}>‹</Text>
      </Pressable>
      <Text style={s.headKicker}>{title}</Text>
      <View style={s.headIcon}><Text style={{ color: colors.forest }}>{glyph('✳')}</Text></View>
    </View>
  );
}

export const Eyeline = ({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) => <Text style={[s.eyeline, style]}>{children}</Text>;
export const AppTitle = ({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) => <Text style={[s.appTitle, style]} accessibilityRole="header">{children}</Text>;
export const Subtitle = ({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) => <Text style={[s.subtitle, style]}>{children}</Text>;
export const SectionTitle = ({ children }: { children: ReactNode }) => <Text style={s.sectionTitle}>{children}</Text>;
export const BlockLabel = ({ children }: { children: ReactNode }) => <Text style={s.blockLabel}>{children}</Text>;
export const SafeNote = ({ children }: { children: ReactNode }) => <Text style={s.safeNote}>{children}</Text>;
export const LittleLabel = ({ children }: { children: ReactNode }) => <Text style={s.littleLabel}>{children}</Text>;
export const FormError = ({ children }: { children: ReactNode }) => <Text style={s.formError} accessibilityRole="alert">{children}</Text>;

export interface DayPillData { key: string; label: string; number: string; selected?: boolean; onPress?: () => void }

export function DayLine({ days, label, onLabel }: { days: DayPillData[]; label?: string; onLabel?: () => void }) {
  return (
    <View style={s.dayLine}>
      <View style={s.dayPills}>
        {days.map((d) => (
          <Pressable key={d.key} onPress={d.onPress} style={[s.dayPill, d.selected && s.dayPillSelected]} accessibilityRole="button" accessibilityState={{ selected: d.selected }} accessibilityLabel={`${d.label} ${d.number}`}>
            <Text style={[s.dayPillB, d.selected && s.white]}>{d.label}</Text>
            <Text style={[s.dayPillStrong, d.selected && s.white]}>{d.number}</Text>
          </Pressable>
        ))}
      </View>
      {label ? <Pressable onPress={onLabel} hitSlop={8}><Text style={s.littleLabel}>{label}</Text></Pressable> : null}
    </View>
  );
}

export function MealHero({ image, name, tag, minutes, diners }: { image: ImageSource | null; name: string; tag: string; minutes: number; diners: number }) {
  return (
    <View style={[s.dinnerHero, shadow]}>
      {image ? <Image source={image} style={StyleSheet.absoluteFill} contentFit="cover" accessibilityLabel={name} /> : <DishPlaceholder />}
      <LinearGradient colors={['#071a1600', '#071a16b8']} locations={[0.32, 1]} style={StyleSheet.absoluteFill} />
      <View style={s.dinnerOverlay}>
        <View style={s.glassTag}><Text style={s.glassTagText}>{glyph('✳')} {tag}</Text></View>
        <View>
          <Text style={s.dinnerTitle}>{name}</Text>
          <View style={s.dinnerMeta}>
            <Text style={s.dinnerMetaText}>{glyph('◷')} {minutes} min</Text>
            <Text style={s.dinnerMetaText}>{glyph('◉')} {diners} {diners === 1 ? 'persoon' : 'personen'}</Text>
            <Text style={s.dinnerMetaText}>{glyph('♡')} 1 maaltijd</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

export function DishPlaceholder({ size = 62 }: { size?: number }) {
  return <View style={[StyleSheet.absoluteFill, s.placeholder]}><Text style={{ fontSize: size, color: '#89AD92' }}>{glyph('✳')}</Text></View>;
}

export function SkeletonHero() {
  return <View style={[s.dinnerHero, { backgroundColor: colors.dayPill, alignItems: 'center', justifyContent: 'center' }]} accessibilityLabel="Voorstel wordt berekend"><ActivityIndicator color={colors.forest} /></View>;
}

export function MatchPanel({ title, badge, check, initials, comment, note }: { title: string; badge: string; check?: boolean; initials: string[]; comment: string; note?: ReactNode }) {
  return (
    <View style={s.matchPanel}>
      <View style={s.rowBetween}>
        <Text style={s.matchTop}>{title}</Text>
        <View style={[s.matchBadge, check && { backgroundColor: taste.care.bg }]}><Text style={[s.matchBadgeText, check && { color: taste.care.fg }]}>{badge}</Text></View>
      </View>
      <View style={[s.rowBetween, { marginTop: 12 }]}>
        <View style={s.miniAvatars}>
          {initials.map((i, idx) => <View key={idx} style={[s.miniAvatar, { backgroundColor: miniAvatars[idx % 4] }]}><Text style={s.miniAvatarText}>{i}</Text></View>)}
        </View>
        <Text style={s.avatarComment}>{comment}</Text>
      </View>
      {note ? <View style={s.microNote}><Text style={{ fontSize: 17, color: '#607D6B' }}>{glyph('✳')}</Text><Text style={s.microNoteText}>{note}</Text></View> : null}
    </View>
  );
}

type BtnVariant = 'primary' | 'plain' | 'orange';
export function Button({ children, variant = 'primary', wide, busy, style, ...rest }: PressableProps & { children: ReactNode; variant?: BtnVariant; wide?: boolean; busy?: boolean; style?: StyleProp<ViewStyle> }) {
  const disabled = rest.disabled || busy;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled, busy: !!busy }}
      {...rest}
      disabled={disabled}
      style={({ pressed }) => [s.btn, variant === 'primary' && s.btnPrimary, variant === 'plain' && s.btnPlain, variant === 'orange' && s.btnOrange, wide && s.btnWide, !wide && variant === 'primary' && { flex: 1 }, (pressed || disabled) && { opacity: disabled ? 0.55 : 0.92 }, style]}
    >
      {busy ? <ActivityIndicator color={variant === 'plain' ? colors.forest : colors.white} /> : <Text style={[s.btnText, variant === 'plain' ? { color: colors.forest } : s.white]}>{children}</Text>}
    </Pressable>
  );
}

export const ActionRow = ({ children }: { children: ReactNode }) => <View style={s.actionRow}>{children}</View>;

export function PlanBStrip({ title, subtitle, onPress }: { title: string; subtitle: string; onPress: () => void }) {
  return (
    <Pressable style={s.planbStrip} onPress={onPress} accessibilityRole="button">
      <View style={{ flex: 1 }}><Text style={s.planbStrong}>{title}</Text><Text style={s.planbSmall}>{subtitle}</Text></View>
      <View style={s.arrowCircle}><Text style={{ fontSize: 19, color: colors.planbText }}>→</Text></View>
    </Pressable>
  );
}

export const TodayFooter = () => <Text style={s.todayFooter}>Ontworpen voor de drukte van het echte leven {glyph('✳')}</Text>;

export function Avatar({ color, initial, size = 41 }: { color: string; initial: string; size?: number }) {
  return <View style={[s.personAvatar, { width: size, height: size, backgroundColor: avatars[color] ?? avatars.p1 }]}><Text style={[s.personAvatarText, size > 50 && { fontSize: 18 }]}>{initial}</Text></View>;
}

export function PersonRow({ color, initial, name, role, sub, onPress }: { color: string; initial: string; name: string; role: string; sub: string; onPress?: () => void }) {
  return (
    <Pressable style={s.familyPerson} onPress={onPress} accessibilityRole="button" accessibilityLabel={`${name}, ${role}. ${sub}`}>
      <Avatar color={color} initial={initial} />
      <View style={{ flex: 1 }}>
        <Text style={s.personName}>{name} <Text style={s.personRole}>· {role}</Text></Text>
        <Text style={s.personSub}>{sub}</Text>
      </View>
      {onPress ? <Text style={s.personArrow}>›</Text> : null}
    </Pressable>
  );
}

export function Banner({ icon, title, sub }: { icon: string; title: string; sub: string }) {
  return (
    <View style={s.banner}>
      <View style={s.bannerIcon}><Text style={{ fontSize: 19, color: colors.forest }}>{glyph(icon)}</Text></View>
      <View style={{ flex: 1 }}><Text style={s.bannerStrong}>{title}</Text><Text style={s.bannerSmall}>{sub}</Text></View>
    </View>
  );
}

export function TasteChip({ type, children }: { type: keyof typeof taste; children: ReactNode }) {
  return <View style={[s.tasteStatus, { backgroundColor: taste[type].bg }]}><Text style={[s.tasteStatusText, { color: taste[type].fg }]}>{children}</Text></View>;
}

export function TasteRow({ label, children }: { label: ReactNode; children?: ReactNode }) {
  return <View style={s.tasteRow}><Text style={[s.tasteRowText, { flex: 1 }]}>{label}</Text>{children}</View>;
}

export function Switch({ on, onToggle, label }: { on: boolean; onToggle: () => void; label: string }) {
  return (
    <Pressable onPress={onToggle} accessibilityRole="switch" accessibilityState={{ checked: on }} accessibilityLabel={label} style={[s.switch, on && { backgroundColor: colors.forest }]} hitSlop={8}>
      <View style={[s.switchKnob, on && { transform: [{ translateX: 17 }] }]} />
    </Pressable>
  );
}

export function ParentToggle({ title, sub, on, onToggle }: { title: string; sub: string; on: boolean; onToggle: () => void }) {
  return (
    <View style={s.parentToggle}>
      <View style={{ flex: 1 }}><Text style={s.parentB}>{title}</Text><Text style={s.parentSmall}>{sub}</Text></View>
      <Switch on={on} onToggle={onToggle} label="Ouderlijke regie in- of uitschakelen" />
    </View>
  );
}

export function ShoppingItem({ label, amount, checked, onToggle, note }: { label: string; amount: string; checked: boolean; onToggle: () => void; note?: string }) {
  return (
    <Pressable style={s.shoppingItem} onPress={onToggle} accessibilityRole="checkbox" accessibilityState={{ checked }} accessibilityLabel={`${label} ${amount}`}>
      <View style={[s.checkbox, checked && s.checkboxOn]}>{checked ? <Text style={s.checkmark}>✓</Text> : null}</View>
      <View style={{ flex: 1 }}>
        <Text style={[s.shoppingText, checked && s.done]}>{label}</Text>
        {note ? <Text style={{ fontSize: 9, color: colors.safeNote, fontFamily: fonts.body500 }}>{note}</Text> : null}
      </View>
      <Text style={[s.amount, checked && s.done]}>{amount}</Text>
    </Pressable>
  );
}

export function Tip({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={s.tip}>
      <Text style={{ fontSize: 19, color: colors.tipText }}>{glyph('✳')}</Text>
      <View style={{ flex: 1 }}><Text style={s.tipStrong}>{title}</Text><Text style={s.tipText}>{children}</Text></View>
    </View>
  );
}

export function Confirmation({ title, text, children }: { title: string; text: string; children?: ReactNode }) {
  return (
    <View style={s.confirmation}>
      <Text style={{ fontSize: 23, color: colors.forest }}>✓</Text>
      <Text style={s.confirmationTitle}>{title}</Text>
      <Text style={s.confirmationText}>{text}</Text>
      {children}
    </View>
  );
}

export function RecipeStep({ index, total, title, body, minutes, children }: { index: number; total: number; title: string; body: string; minutes?: number | null; children?: ReactNode }) {
  return (
    <View style={s.recipeStep}>
      <Text style={s.stepKicker}>STAP {index} VAN {total}</Text>
      <Text style={s.stepTitle}>{title}</Text>
      <Text style={s.stepText}>{body}</Text>
      {minutes ? <Text style={s.stepTimer}>{glyph('◷')} {minutes} minuten</Text> : null}
      {children}
    </View>
  );
}

export function Chip({ label, selected, onPress, strict }: { label: string; selected?: boolean; onPress: () => void; strict?: boolean }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityState={{ selected: !!selected }} style={[s.chip, selected && (strict ? s.chipStrict : s.chipOn)]}>
      <Text style={[s.chipText, selected && { color: strict ? taste.strict.fg : taste.like.fg }]}>{label}</Text>
    </Pressable>
  );
}

export const ChipRow = ({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) => <View style={[s.chipRow, style]}>{children}</View>;

export function Field({ label, hint, ...input }: TextInputProps & { label: string; hint?: string }) {
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={s.fieldLabel}>{label}</Text>
      <TextInput placeholderTextColor={colors.placeholder} style={s.textInput} accessibilityLabel={label} {...input} />
      {hint ? <Text style={s.fieldHint}>{hint}</Text> : null}
    </View>
  );
}

export function Checkbox({ checked, onToggle, label, hint, disabled }: { checked: boolean; onToggle: () => void; label: string; hint?: string; disabled?: boolean }) {
  return (
    <Pressable onPress={onToggle} disabled={disabled} accessibilityRole="checkbox" accessibilityState={{ checked, disabled }} style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start', marginVertical: 14 }}>
      <View style={[s.checkbox, checked && s.checkboxOn, { marginTop: 1 }]}>{checked ? <Text style={s.checkmark}>✓</Text> : null}</View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 12, fontFamily: fonts.body800, color: colors.forestDark }}>{label}</Text>
        {hint ? <Text style={s.fieldHint}>{hint}</Text> : null}
      </View>
    </Pressable>
  );
}

export function HardSection({ title, children }: { title: string; children: ReactNode }) {
  return <View style={s.hardSection}><Text style={s.hardTitle}>{title}</Text>{children}</View>;
}
export const HardText = ({ children }: { children: ReactNode }) => <Text style={s.hardText}>{children}</Text>;

export function Toast({ message, action }: { message: string; action?: { label: string; run: () => void } }) {
  return (
    <View style={s.toast} accessibilityRole="alert" accessibilityLiveRegion="polite">
      <Text style={s.toastText}>{message}</Text>
      {action ? <Pressable onPress={action.run} hitSlop={8}><Text style={s.toastAction}>{action.label}</Text></Pressable> : null}
    </View>
  );
}

export const s = StyleSheet.create({
  white: { color: colors.white },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  appView: { paddingTop: 15, paddingHorizontal: 18, paddingBottom: 20 },
  appHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4, marginBottom: 20 },
  appBrand: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  appBrandText: { fontFamily: fonts.display700, fontSize: 23, letterSpacing: -0.8, color: colors.forest },
  avatarSmall: { width: 35, height: 35, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.avatarSmall, borderWidth: 2, borderColor: colors.white },
  avatarSmallText: { color: colors.forest, fontSize: 12, fontFamily: fonts.body800 },
  subHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 },
  roundBack: { backgroundColor: colors.roundBack, borderRadius: 17, width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  roundBackText: { color: colors.forest, fontSize: 20, fontFamily: fonts.body700, marginTop: -2 },
  headKicker: { fontSize: 10, fontFamily: fonts.body800, letterSpacing: 1.2, color: colors.headKicker },
  headIcon: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.headIcon, alignItems: 'center', justifyContent: 'center' },
  eyeline: { fontSize: 10, fontFamily: fonts.body800, color: colors.eyeline, letterSpacing: 1.2, textTransform: 'uppercase' },
  appTitle: { fontFamily: fonts.display600, fontSize: 29, lineHeight: 32.5, letterSpacing: -0.8, color: colors.forestDark, marginTop: 7, marginBottom: 14 },
  subtitle: { fontSize: 12, fontFamily: fonts.body400, color: colors.subtitle, lineHeight: 18.6, marginBottom: 19 },
  sectionTitle: { fontSize: 11, color: colors.sectionTitle, textTransform: 'uppercase', letterSpacing: 1.1, fontFamily: fonts.body800, marginTop: 19, marginBottom: 11 },
  blockLabel: { fontSize: 12, fontFamily: fonts.body800, color: colors.forestDark, marginTop: 15, marginBottom: 10 },
  safeNote: { fontSize: 10, fontFamily: fonts.body400, color: colors.safeNote, lineHeight: 15.5, marginTop: 12 },
  littleLabel: { fontSize: 10, fontFamily: fonts.body700, color: colors.littleLabel },
  formError: { fontSize: 11, color: colors.error, fontFamily: fonts.body700, marginTop: 6 },
  dayLine: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  dayPills: { flexDirection: 'row', gap: 6 },
  dayPill: { width: 30, height: 34, borderRadius: 10, backgroundColor: colors.dayPill, alignItems: 'center', justifyContent: 'center' },
  dayPillSelected: { backgroundColor: colors.forest },
  dayPillB: { fontSize: 9, fontFamily: fonts.body700, color: colors.dayPillText, lineHeight: 11.7 },
  dayPillStrong: { fontSize: 13, fontFamily: fonts.body700, color: colors.dayPillText, lineHeight: 15 },
  dinnerHero: { height: 233, borderRadius: 22, overflow: 'hidden', backgroundColor: colors.hero },
  placeholder: { backgroundColor: '#DFEBDF', alignItems: 'center', justifyContent: 'center' },
  dinnerOverlay: { ...StyleSheet.absoluteFill, justifyContent: 'space-between', padding: 16 },
  glassTag: { alignSelf: 'flex-start', borderRadius: 30, paddingVertical: 7, paddingHorizontal: 11, backgroundColor: '#fffdf1e8' },
  glassTagText: { fontSize: 10, fontFamily: fonts.body800, color: '#214B34' },
  dinnerTitle: { fontFamily: fonts.display600, fontSize: 27, lineHeight: 27.8, color: colors.white, letterSpacing: -0.6, marginBottom: 8, maxWidth: 270 },
  dinnerMeta: { flexDirection: 'row', gap: 10 },
  dinnerMetaText: { color: '#ffffffe5', fontSize: 10, fontFamily: fonts.body700 },
  matchPanel: { paddingVertical: 14, paddingHorizontal: 16, backgroundColor: colors.matchPanel, borderRadius: 18, marginTop: 12 },
  matchTop: { fontSize: 12, color: colors.forest, fontFamily: fonts.body800 },
  matchBadge: { backgroundColor: colors.matchBadge, borderRadius: 30, paddingVertical: 5, paddingHorizontal: 9 },
  matchBadgeText: { fontSize: 10, color: colors.matchBadgeText, fontFamily: fonts.body800 },
  miniAvatars: { flexDirection: 'row', alignItems: 'center', paddingLeft: 5 },
  miniAvatar: { width: 28, height: 28, borderWidth: 2, borderColor: colors.matchPanel, marginLeft: -5, alignItems: 'center', justifyContent: 'center', borderRadius: 14 },
  miniAvatarText: { fontSize: 9, fontFamily: fonts.body800, color: '#3C4F40' },
  avatarComment: { fontSize: 10, fontFamily: fonts.body700, color: '#59806B' },
  microNote: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 10 },
  microNoteText: { flex: 1, color: '#607D6B', fontSize: 10, lineHeight: 14.5, fontFamily: fonts.body400 },
  actionRow: { flexDirection: 'row', gap: 8, marginTop: 13 },
  btn: { borderRadius: 12, paddingVertical: 12, paddingHorizontal: 13, minHeight: 41, alignItems: 'center', justifyContent: 'center', flexDirection: 'row' },
  btnPrimary: { backgroundColor: colors.forest },
  btnPlain: { borderWidth: 1, borderColor: colors.plainBorder, backgroundColor: colors.white },
  btnOrange: { backgroundColor: colors.orange },
  btnWide: { alignSelf: 'stretch' },
  btnText: { fontSize: 12, fontFamily: fonts.body800 },
  planbStrip: { borderWidth: 1, borderColor: colors.planbBorder, backgroundColor: colors.planbBg, borderRadius: 15, paddingVertical: 12, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 },
  planbStrong: { fontSize: 12, fontFamily: fonts.body700, color: colors.planbText },
  planbSmall: { fontSize: 10, fontFamily: fonts.body400, color: colors.planbSmall, marginTop: 3 },
  arrowCircle: { backgroundColor: colors.planbCircle, width: 29, height: 29, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  todayFooter: { color: colors.footer, textAlign: 'center', fontSize: 10, marginTop: 13, fontFamily: fonts.body400 },
  personAvatar: { borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  personAvatarText: { fontSize: 13, fontFamily: fonts.body800, color: '#345340' },
  familyPerson: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.personBorder, borderRadius: 17, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 11, marginBottom: 8 },
  personName: { fontSize: 12, fontFamily: fonts.body700, color: colors.personName },
  personRole: { fontSize: 10, fontFamily: fonts.body500, color: '#91A294' },
  personSub: { fontSize: 10, fontFamily: fonts.body400, color: colors.personSub, marginTop: 4 },
  personArrow: { fontSize: 19, color: colors.personArrow },
  banner: { backgroundColor: colors.banner, borderRadius: 17, padding: 14, flexDirection: 'row', gap: 11, alignItems: 'center', marginBottom: 16 },
  bannerIcon: { width: 36, height: 36, borderRadius: 12, backgroundColor: colors.bannerIcon, alignItems: 'center', justifyContent: 'center' },
  bannerStrong: { fontSize: 12, fontFamily: fonts.body700, color: colors.forest },
  bannerSmall: { fontSize: 10, fontFamily: fonts.body400, color: colors.bannerSmall, marginTop: 3 },
  tasteRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: colors.tasteRowLine, gap: 8 },
  tasteRowText: { fontSize: 11, color: colors.tasteRowText, fontFamily: fonts.body700 },
  tasteStatus: { borderRadius: 9, paddingVertical: 6, paddingHorizontal: 9 },
  tasteStatusText: { fontSize: 10, fontFamily: fonts.body800 },
  switch: { width: 39, height: 22, backgroundColor: colors.switchOff, borderRadius: 18, padding: 3 },
  switchKnob: { width: 16, height: 16, borderRadius: 8, backgroundColor: colors.white },
  parentToggle: { backgroundColor: colors.parentBg, borderWidth: 1, borderColor: colors.parentBorder, borderRadius: 15, padding: 12, marginTop: 14, flexDirection: 'row', alignItems: 'center', gap: 8 },
  parentB: { fontSize: 11, color: colors.parentTitle, fontFamily: fonts.body700 },
  parentSmall: { fontSize: 9, color: colors.parentSmall, marginTop: 2, fontFamily: fonts.body400 },
  shoppingItem: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.shoppingLine },
  checkbox: { width: 19, height: 19, borderWidth: 1.5, borderColor: colors.checkboxBorder, borderRadius: 6, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  checkboxOn: { backgroundColor: colors.forest, borderColor: colors.forest },
  checkmark: { color: colors.white, fontSize: 13, fontFamily: fonts.body700, lineHeight: 15 },
  shoppingText: { fontSize: 12, color: colors.shoppingText, fontFamily: fonts.body400 },
  done: { color: colors.doneText, textDecorationLine: 'line-through' },
  amount: { color: colors.amount, fontSize: 11, fontFamily: fonts.body400 },
  tip: { borderRadius: 15, padding: 13, backgroundColor: colors.tipBg, flexDirection: 'row', gap: 11, alignItems: 'flex-start', marginTop: 18 },
  tipStrong: { color: colors.tipStrong, fontSize: 11, fontFamily: fonts.body700, lineHeight: 17.6 },
  tipText: { color: colors.tipText, fontSize: 11, lineHeight: 17.6, fontFamily: fonts.body400 },
  confirmation: { backgroundColor: colors.confirmation, borderRadius: 16, padding: 15, marginTop: 13, alignItems: 'center' },
  confirmationTitle: { fontFamily: fonts.display600, fontSize: 21, color: colors.forest, marginVertical: 7 },
  confirmationText: { fontSize: 11, color: colors.forest, marginTop: 4, marginBottom: 13, textAlign: 'center', fontFamily: fonts.body400 },
  recipeStep: { borderWidth: 1, borderColor: colors.stepBorder, backgroundColor: colors.white, borderRadius: 15, padding: 14, marginTop: 12 },
  stepKicker: { fontSize: 10, color: colors.stepKicker, fontFamily: fonts.body800, letterSpacing: 1 },
  stepTitle: { fontFamily: fonts.display600, fontSize: 21, color: colors.ink, marginVertical: 8 },
  stepText: { fontSize: 12, color: colors.stepText, lineHeight: 20.4, fontFamily: fonts.body400 },
  stepTimer: { color: colors.orange, fontFamily: fonts.body800, marginTop: 9, fontSize: 11 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { borderWidth: 1.5, borderColor: colors.scenarioBorder, backgroundColor: colors.white, borderRadius: 10, paddingVertical: 7, paddingHorizontal: 10 },
  chipOn: { borderColor: colors.forest, backgroundColor: taste.like.bg },
  chipStrict: { borderColor: taste.strict.fg, backgroundColor: taste.strict.bg },
  chipText: { fontSize: 11, fontFamily: fonts.body800, color: colors.forestDark },
  fieldLabel: { fontSize: 12, fontFamily: fonts.body800, color: colors.forestDark, marginBottom: 7 },
  fieldHint: { fontSize: 10, color: colors.subtitle, marginTop: 5, lineHeight: 15, fontFamily: fonts.body400 },
  textInput: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.inputBorder, borderRadius: 12, padding: 11, fontSize: 13, color: colors.forest, fontFamily: fonts.body400 },
  hardSection: { borderWidth: 1, borderColor: taste.strict.bg, backgroundColor: '#FFF8F5', borderRadius: 15, padding: 12, marginTop: 14 },
  hardTitle: { fontSize: 12, color: taste.strict.fg, fontFamily: fonts.body800, marginBottom: 4 },
  hardText: { fontSize: 10, color: '#A26B5A', marginBottom: 8, lineHeight: 15, fontFamily: fonts.body400 },
  toast: { position: 'absolute', zIndex: 10, bottom: 83, left: 22, right: 22, backgroundColor: colors.toast, paddingVertical: 12, paddingHorizontal: 15, borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  toastText: { color: colors.white, fontSize: 11, fontFamily: fonts.body800, flex: 1 },
  toastAction: { color: colors.planbCircle, fontSize: 11, fontFamily: fonts.body800, textDecorationLine: 'underline' },
});
