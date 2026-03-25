import React, { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { Modal, Platform, ScrollView, Text, TextInput, View } from 'react-native';
import { InteractivePressable as Pressable } from './InteractivePressable';
import { useUiTheme } from '../context/UiThemeContext';
import type { CommandCategory, CommandPaletteItem } from '../types';


const CATEGORY_LABELS: Record<CommandCategory, string> = {
    navigation: 'Navigation',
    workspace: 'Workspace',
    tenant: 'Tenant',
    settings: 'Settings',
    ai: 'AI Assistant',
    record: 'Records',
    flow: 'Automation',
};

const CATEGORY_ICONS: Record<CommandCategory, string> = {
    navigation: '→',
    workspace: '◈',
    tenant: '◎',
    settings: '⚙',
    ai: '✦',
    record: '▣',
    flow: '⚡',
};

function fuzzyMatch(query: string, target: string): boolean {
    const q = query.toLowerCase();
    const t = target.toLowerCase();
    if (t.includes(q)) return true;
    let qi = 0;
    for (let ti = 0; ti < t.length && qi < q.length; ti++) {
        if (t[ti] === q[qi]) qi++;
    }
    return qi === q.length;
}

export function CommandPalette({
    visible,
    onClose,
    commands,
}: {
    visible: boolean;
    onClose: () => void;
    commands: CommandPaletteItem[];
}) {
    const { mode, styles } = useUiTheme();
    const [query, setQuery] = useState('');
    const deferredQuery = useDeferredValue(query);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const inputRef = useRef<TextInput>(null);

    const filtered = useMemo(() => {
        if (!deferredQuery.trim()) return commands.slice(0, 20);
        return commands.filter(
            (cmd) =>
                fuzzyMatch(deferredQuery, cmd.label) ||
                fuzzyMatch(deferredQuery, cmd.description ?? '') ||
                cmd.keywords.some((kw) => fuzzyMatch(deferredQuery, kw)),
        ).slice(0, 20);
    }, [deferredQuery, commands]);

    const grouped = useMemo(() => {
        const map = new Map<CommandCategory, CommandPaletteItem[]>();
        for (const item of filtered) {
            const list = map.get(item.category) ?? [];
            list.push(item);
            map.set(item.category, list);
        }
        return Array.from(map.entries());
    }, [filtered]);

    useEffect(() => {
        setSelectedIndex(0);
    }, [query]);

    useEffect(() => {
        if (visible) {
            setQuery('');
            setSelectedIndex(0);
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [visible]);

    // Global keyboard shortcut
    useEffect(() => {
        if (Platform.OS !== 'web') return;
        const handler = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                if (visible) {
                    onClose();
                } else {
                    // parent handles open; this handles close
                }
            }
            if (!visible) return;
            if (e.key === 'Escape') {
                e.preventDefault();
                onClose();
            }
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSelectedIndex((prev) => Math.min(prev + 1, filtered.length - 1));
            }
            if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSelectedIndex((prev) => Math.max(prev - 1, 0));
            }
            if (e.key === 'Enter') {
                e.preventDefault();
                const item = filtered[selectedIndex];
                if (item) {
                    item.action();
                    onClose();
                }
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [visible, onClose, filtered, selectedIndex]);

    const handleSelect = useCallback(
        (item: CommandPaletteItem) => {
            item.action();
            onClose();
        },
        [onClose],
    );

    const isDark = mode === 'night';

    if (!visible) return null;

    let flatIndex = -1;

    return (
        <Modal transparent visible animationType = "fade" onRequestClose = { onClose } >
            <Pressable
        style={
        {
            flex: 1,
                justifyContent: 'flex-start',
                    alignItems: 'center',
                        paddingTop: 80,
                            backgroundColor: 'rgba(0,0,0,0.55)',
        }
    }
    onPress = { onClose }
        >
        <Pressable
          onPress={ () => { } }
    style = {{
        width: '90%',
            maxWidth: 620,
                borderRadius: 16,
                    borderWidth: 1,
                        borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.10)',
                            backgroundColor: isDark ? 'rgba(14,10,28,0.96)' : 'rgba(255,255,255,0.98)',
                                backdropFilter: 'blur(24px)',
                                    overflow: 'hidden',
                                        boxShadow: '0 24px 80px rgba(0,0,0,0.45)',
          } as any
}
        >
    {/* Search row */ }
    < View
style = {{
    flexDirection: 'row',
        alignItems: 'center',
            paddingHorizontal: 16,
                paddingVertical: 12,
                    borderBottomWidth: 1,
                        borderBottomColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                            gap: 10,
            }}
          >
    <Text style={ { fontSize: 18, color: isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.35)' } }>⌘K </Text>
        < TextInput
ref = { inputRef }
value = { query }
onChangeText = { setQuery }
placeholder = "Type a command or search..."
placeholderTextColor = { isDark? 'rgba(255,255,255,0.38)': 'rgba(0,0,0,0.38)' }
autoFocus
autoCapitalize = "none"
autoCorrect = { false}
style = {{
    flex: 1,
        fontSize: 16,
            fontWeight: '500',
                color: isDark ? '#FFFFFF' : '#111111',
                    outlineStyle: 'none',
                        outlineWidth: 0,
                            borderWidth: 0,
                                backgroundColor: 'transparent',
                                    paddingVertical: 4,
              } as any}
            />
    < Pressable
onPress = { onClose }
style = {{
    paddingHorizontal: 8,
        paddingVertical: 4,
            borderRadius: 6,
                borderWidth: 1,
                    borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.10)',
                        backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
              }}
            >
    <Text style={ { fontSize: 11, fontWeight: '600', color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.45)' } }> ESC </Text>
        </Pressable>
        </View>

{/* Results */ }
<ScrollView
            style={ { maxHeight: 380 } }
keyboardShouldPersistTaps = "handled"
showsVerticalScrollIndicator = { false}
    >
{
    filtered.length === 0 ? (
        <View style= {{ padding: 24, alignItems: 'center' }}>
            <Text style={ { fontSize: 14, color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)' } }>
                No matching commands
                    </Text>
                    </View>
            ) : (
    grouped.map(([category, items]) => (
        <View key= { category } >
        <View
                    style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: 6,
    }}
                  >
        <Text style={{ fontSize: 11, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase', color: isDark ? 'rgba(255,211,50,0.7)' : 'rgba(38,51,116,0.7)' }}>
    { CATEGORY_ICONS[category]} { CATEGORY_LABELS[category]}
    </Text>
    </View>
                  {
            items.map((item) => {
                flatIndex++;
                const isSelected = flatIndex === selectedIndex;
                const fi = flatIndex; // capture
                return (
                    <Pressable
                        key= { item.id }
                onPress = {() => handleSelect(item)
            }
                        onHoverIn = {() => setSelectedIndex(fi)}
                        style = {{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingHorizontal: 16,
        paddingVertical: 10,
        marginHorizontal: 6,
        borderRadius: 10,
        backgroundColor: isSelected
            ? isDark
                ? 'rgba(38,51,116,0.18)'
                : 'rgba(38,51,116,0.10)'
            : 'transparent',
    }}
                      >
        <Text style={{ fontSize: 16, width: 22, textAlign: 'center', color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.4)' }}>
        { CATEGORY_ICONS[item.category]}
        </Text>
    < View style = {{ flex: 1 }}>
    <Text
                            style={{
        fontSize: 14,
        fontWeight: '600',
        color: isSelected
            ? isDark
                ? '#FFD332'
                : '#FFD332'
            : isDark
                ? '#FFFFFF'
                : '#111111',
    }}
        numberOfLines = { 1}
        >
        { item.label }
        </Text>
                          {!!item.description && (
        <Text
                              style={{
        fontSize: 12,
        color: isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)',
        marginTop: 1,
    }}
        numberOfLines = { 1}
        >
        { item.description }
        </Text>
    )}
</View>
{
    isSelected && (
        <Text style={ { fontSize: 11, color: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.25)' } }>↵</Text>
                        )
}
</Pressable>
                    );
                  })}
</View>
              ))
            )}
</ScrollView>

{/* Footer */ }
<View
            style={
    {
        flexDirection: 'row',
            justifyContent: 'space-between',
                alignItems: 'center',
                    paddingHorizontal: 16,
                        paddingVertical: 8,
                            borderTopWidth: 1,
                                borderTopColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
            }
}
          >
    <Text style={ { fontSize: 11, color: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)' } }>
        { filtered.length } command{ filtered.length !== 1 ? 's' : '' }
</Text>
    < View style = {{ flexDirection: 'row', gap: 8 }}>
        <Text style={ { fontSize: 11, color: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)' } }>↑↓ Navigate </Text>
            < Text style = {{ fontSize: 11, color: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)' }}>↵ Select </Text>
                < Text style = {{ fontSize: 11, color: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)' }}> Esc Close </Text>
                    </View>
                    </View>
                    </Pressable>
                    </Pressable>
                    </Modal>
  );
}
