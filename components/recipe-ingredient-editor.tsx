import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import type { EditableIngredient } from '@/src/types/recipe';
import { INGREDIENT_CONFIRM_THRESHOLD } from '@/src/utils/recipe-ingredients';
import { colors, radius, spacing } from '@/src/theme/snapdish';

type Props = {
  rows: EditableIngredient[];
  checkedNames: Set<string>;
  onTogglePantry: (id: string, name: string) => void;
  onConfirm: (id: string) => void;
  onReject: (id: string) => void;
  onRemove: (id: string) => void;
  onAdd: (name: string, quantity: string) => void;
  onUpdateQuantity: (id: string, quantity: string) => void;
  onUseAlternative?: (id: string, alternativeName: string) => void;
  nutritionBusy?: boolean;
};

function QuantityEditor({
  value,
  onSave,
  onCancel,
  compact,
}: {
  value: string;
  onSave: (qty: string) => void;
  onCancel: () => void;
  compact?: boolean;
}) {
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  const commit = () => {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== value.trim()) onSave(trimmed);
    else onCancel();
  };

  return (
    <View style={[styles.qtyEditRow, compact && styles.qtyEditRowCompact]}>
      <TextInput
        style={[styles.qtyInput, compact && styles.qtyInputCompact]}
        value={draft}
        onChangeText={setDraft}
        placeholder="e.g. 150 g"
        placeholderTextColor={colors.textTertiary}
        autoFocus
        selectTextOnFocus
        returnKeyType="done"
        onSubmitEditing={commit}
        onBlur={commit}
      />
      <Pressable hitSlop={8} onPress={onCancel} accessibilityLabel="Cancel quantity edit">
        <Ionicons name="close" size={18} color={colors.textTertiary} />
      </Pressable>
    </View>
  );
}

export function RecipeIngredientEditor({
  rows,
  checkedNames,
  onTogglePantry,
  onConfirm,
  onReject,
  onRemove,
  onAdd,
  onUpdateQuantity,
  onUseAlternative,
  nutritionBusy,
}: Props) {
  const [addOpen, setAddOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newQty, setNewQty] = useState('');
  const [editingQtyId, setEditingQtyId] = useState<string | null>(null);

  const visible = rows.filter((r) => r.userStatus !== 'rejected');
  const pending = visible.filter((r) => r.userStatus === 'pending');

  const submitAdd = () => {
    const name = newName.trim();
    const quantity = newQty.trim();
    if (!name || !quantity) return;
    onAdd(name, quantity);
    setNewName('');
    setNewQty('');
    setAddOpen(false);
  };

  return (
    <View style={styles.wrap}>
      {pending.length > 0 ? (
        <View style={styles.pendingBanner}>
          <Ionicons name="eye-outline" size={18} color={colors.statRateIcon} />
          <ThemedText style={styles.pendingBannerText}>
            We spotted {pending.length} ingredient{pending.length > 1 ? 's' : ''} in your photo — confirm, adjust the amount, or remove each one.
          </ThemedText>
        </View>
      ) : null}

      {visible.map((item) => {
        const isPending = item.userStatus === 'pending';
        const isAdded = item.userStatus === 'added';
        const checked = checkedNames.has(item.name);
        const isEditingQty = editingQtyId === item.id;
        const canEditQty = isPending || isAdded || item.userStatus === 'confirmed';

        return (
          <View
            key={item.id}
            style={[
              styles.row,
              isPending && styles.rowPending,
              isAdded && styles.rowAdded,
              checked && !isPending && styles.rowChecked,
            ]}>
            {isPending ? (
              <View style={styles.pendingBody}>
                <View style={styles.pendingTop}>
                  <ThemedText style={styles.pendingLabel}>Is this in your dish?</ThemedText>
                  {item.confidence != null ? (
                    <ThemedText style={styles.confidenceTag}>
                      {Math.round(item.confidence * 100)}% sure
                    </ThemedText>
                  ) : null}
                </View>
                <ThemedText style={styles.ingName}>{item.name}</ThemedText>
                {isEditingQty ? (
                  <QuantityEditor
                    value={item.quantity}
                    compact
                    onSave={(qty) => {
                      onUpdateQuantity(item.id, qty);
                      setEditingQtyId(null);
                    }}
                    onCancel={() => setEditingQtyId(null)}
                  />
                ) : (
                  <Pressable
                    style={styles.qtyTapRow}
                    onPress={() => setEditingQtyId(item.id)}
                    accessibilityRole="button"
                    accessibilityLabel={`Edit quantity for ${item.name}`}>
                    <ThemedText style={styles.ingQty}>{item.quantity}</ThemedText>
                    <Ionicons name="pencil" size={14} color={colors.brand} />
                  </Pressable>
                )}
                {item.possibleAlternative && onUseAlternative ? (
                  <Pressable
                    style={styles.altBtn}
                    onPress={() => onUseAlternative(item.id, item.possibleAlternative!)}>
                    <ThemedText style={styles.altBtnText}>Use {item.possibleAlternative} instead</ThemedText>
                  </Pressable>
                ) : item.possibleAlternative ? (
                  <ThemedText style={styles.altHint}>Or could be: {item.possibleAlternative}</ThemedText>
                ) : null}
                <View style={styles.confirmRow}>
                  <Pressable style={styles.yesBtn} onPress={() => onConfirm(item.id)}>
                    <Ionicons name="checkmark" size={16} color="#FFF" />
                    <ThemedText style={styles.yesBtnText}>Yes, include</ThemedText>
                  </Pressable>
                  <Pressable style={styles.noBtn} onPress={() => onReject(item.id)}>
                    <ThemedText style={styles.noBtnText}>Not in my dish</ThemedText>
                  </Pressable>
                </View>
              </View>
            ) : (
              <Pressable style={styles.confirmedRow} onPress={() => onTogglePantry(item.id, item.name)}>
                <View style={[styles.checkCircle, checked && styles.checkCircleOn]}>
                  {checked ? <Ionicons name="checkmark" size={14} color="#FFF" /> : null}
                </View>
                <View style={styles.ingTextBlock}>
                  <View style={styles.nameRow}>
                    <ThemedText style={[styles.ingName, checked && styles.ingNameChecked]}>{item.name}</ThemedText>
                    {isAdded ? (
                      <ThemedText style={styles.addedTag}>added by you</ThemedText>
                    ) : item.detectedFromPhoto ? (
                      <ThemedText style={styles.photoTag}>from photo</ThemedText>
                    ) : null}
                  </View>
                  {item.matchedFood ? (
                    <ThemedText style={styles.matchedFoodTag} numberOfLines={1}>
                      USDA: {item.matchedFood}
                    </ThemedText>
                  ) : null}
                </View>
                <View style={styles.ingQtyBlock}>
                  {isEditingQty ? (
                    <QuantityEditor
                      value={item.quantity}
                      onSave={(qty) => {
                        onUpdateQuantity(item.id, qty);
                        setEditingQtyId(null);
                      }}
                      onCancel={() => setEditingQtyId(null)}
                    />
                  ) : (
                    <Pressable
                      style={styles.qtyTapRow}
                      onPress={(e) => {
                        e.stopPropagation?.();
                        if (canEditQty) setEditingQtyId(item.id);
                      }}
                      disabled={!canEditQty}
                      accessibilityRole="button"
                      accessibilityLabel={`Edit quantity for ${item.name}`}>
                      <ThemedText style={styles.ingQty}>{item.quantity}</ThemedText>
                      {canEditQty ? (
                        <Ionicons name="pencil-outline" size={12} color={colors.textTertiary} />
                      ) : null}
                    </Pressable>
                  )}
                  {item.calories != null && item.calories > 0 ? (
                    <ThemedText style={styles.ingCalories}>{item.calories} kcal</ThemedText>
                  ) : nutritionBusy ? (
                    <ThemedText style={styles.ingCalories}>…</ThemedText>
                  ) : null}
                </View>
                <Pressable
                  hitSlop={10}
                  style={styles.removeBtn}
                  onPress={(e) => {
                    e.stopPropagation?.();
                    onRemove(item.id);
                  }}>
                  <Ionicons name="close-circle" size={22} color={colors.textTertiary} />
                </Pressable>
              </Pressable>
            )}
          </View>
        );
      })}

      <ThemedText style={styles.thresholdHint}>
        Items below {Math.round(INGREDIENT_CONFIRM_THRESHOLD * 100)}% confidence from your photo need your OK. Tap any amount to edit.
      </ThemedText>

      <Pressable style={styles.addBtn} onPress={() => setAddOpen(true)}>
        <Ionicons name="add-circle-outline" size={20} color={colors.brand} />
        <ThemedText style={styles.addBtnText}>Add missing ingredient</ThemedText>
      </Pressable>

      <Modal visible={addOpen} transparent animationType="fade" onRequestClose={() => setAddOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setAddOpen(false)}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <ThemedText style={styles.modalTitle}>Add ingredient</ThemedText>
            <ThemedText style={styles.modalHint}>Use a weight or volume so calories stay accurate (e.g. 150 g, 2 tbsp).</ThemedText>
            <TextInput
              style={styles.input}
              placeholder="Ingredient name"
              placeholderTextColor={colors.textTertiary}
              value={newName}
              onChangeText={setNewName}
            />
            <TextInput
              style={styles.input}
              placeholder="Quantity (e.g. 200 g)"
              placeholderTextColor={colors.textTertiary}
              value={newQty}
              onChangeText={setNewQty}
            />
            <View style={styles.modalActions}>
              <Pressable style={styles.modalCancel} onPress={() => setAddOpen(false)}>
                <ThemedText style={styles.modalCancelText}>Cancel</ThemedText>
              </Pressable>
              <Pressable
                style={[styles.modalSave, (!newName.trim() || !newQty.trim()) && styles.modalSaveDisabled]}
                disabled={!newName.trim() || !newQty.trim()}
                onPress={submitAdd}>
                <ThemedText style={styles.modalSaveText}>Add</ThemedText>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 8,
    marginTop: 4,
  },
  pendingBanner: {
    alignItems: 'flex-start',
    backgroundColor: colors.statRate,
    borderRadius: radius.sm,
    flexDirection: 'row',
    gap: 8,
    padding: 12,
  },
  pendingBannerText: {
    color: colors.text,
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  thresholdHint: {
    color: colors.textTertiary,
    fontSize: 11,
    lineHeight: 15,
    marginTop: 2,
    paddingHorizontal: 4,
  },
  row: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.sm,
    overflow: 'hidden',
  },
  rowPending: {
    backgroundColor: '#FFF8E6',
    borderColor: '#F5D76E',
    borderWidth: 1,
  },
  rowAdded: {
    borderColor: colors.brand,
    borderWidth: 1,
  },
  rowChecked: {
    backgroundColor: '#EEFBF2',
  },
  pendingBody: {
    gap: 6,
    padding: 12,
  },
  pendingTop: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  pendingLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  confidenceTag: {
    backgroundColor: colors.statRate,
    borderRadius: 8,
    color: colors.text,
    fontSize: 11,
    fontWeight: '700',
    overflow: 'hidden',
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  altHint: {
    color: colors.textSecondary,
    fontSize: 12,
    fontStyle: 'italic',
  },
  altBtn: {
    alignSelf: 'flex-start',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.sm,
    borderWidth: 1,
    marginTop: 2,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  altBtnText: {
    color: colors.brand,
    fontSize: 12,
    fontWeight: '600',
  },
  confirmRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 6,
  },
  yesBtn: {
    alignItems: 'center',
    backgroundColor: colors.brand,
    borderRadius: radius.sm,
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    paddingVertical: 10,
  },
  yesBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
  noBtn: {
    alignItems: 'center',
    borderColor: colors.border,
    borderRadius: radius.sm,
    borderWidth: 1,
    flex: 1,
    justifyContent: 'center',
    paddingVertical: 10,
  },
  noBtnText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  confirmedRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  checkCircle: {
    alignItems: 'center',
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 2,
    height: 24,
    justifyContent: 'center',
    width: 24,
  },
  checkCircleOn: {
    backgroundColor: colors.brand,
    borderColor: colors.brand,
  },
  ingTextBlock: {
    flex: 1,
    gap: 2,
  },
  nameRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  ingName: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
  ingNameChecked: {
    textDecorationLine: 'line-through',
  },
  photoTag: {
    backgroundColor: colors.statPrep,
    borderRadius: 6,
    color: colors.statPrepIcon,
    fontSize: 10,
    fontWeight: '700',
    overflow: 'hidden',
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  addedTag: {
    backgroundColor: '#E8F5E9',
    borderRadius: 6,
    color: colors.brand,
    fontSize: 10,
    fontWeight: '700',
    overflow: 'hidden',
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  matchedFoodTag: {
    color: colors.textTertiary,
    fontSize: 11,
  },
  ingQtyBlock: {
    alignItems: 'flex-end',
    gap: 4,
    minWidth: 88,
  },
  qtyTapBlock: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    gap: 4,
  },
  qtyTapRow: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    flexDirection: 'row',
    gap: 6,
  },
  ingQty: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  ingCalories: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
  },
  qtyEditRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
    width: '100%',
  },
  qtyEditRowCompact: {
    alignSelf: 'flex-start',
    maxWidth: 220,
  },
  qtyInput: {
    backgroundColor: colors.surface,
    borderColor: colors.brand,
    borderRadius: radius.sm,
    borderWidth: 1,
    color: colors.text,
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    minWidth: 72,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  qtyInputCompact: {
    flex: 0,
    minWidth: 120,
  },
  removeBtn: {
    marginLeft: 2,
  },
  addBtn: {
    alignItems: 'center',
    borderColor: colors.border,
    borderRadius: radius.sm,
    borderStyle: 'dashed',
    borderWidth: 1.5,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    marginTop: 4,
    paddingVertical: 14,
  },
  addBtnText: {
    color: colors.brand,
    fontSize: 15,
    fontWeight: '600',
  },
  modalBackdrop: {
    backgroundColor: colors.overlay,
    flex: 1,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    gap: spacing.sm,
    padding: spacing.lg,
  },
  modalTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
  },
  modalHint: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
  input: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.sm,
    color: colors.text,
    fontSize: 16,
    paddingHorizontal: spacing.sm,
    paddingVertical: 12,
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'flex-end',
    marginTop: spacing.xs,
  },
  modalCancel: {
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
  },
  modalCancelText: {
    color: colors.textSecondary,
    fontSize: 15,
    fontWeight: '600',
  },
  modalSave: {
    backgroundColor: colors.text,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: 12,
  },
  modalSaveDisabled: {
    opacity: 0.45,
  },
  modalSaveText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
