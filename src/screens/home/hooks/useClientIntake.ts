import { useEffect, useMemo, useState } from 'react';
import { useAppState } from '../../../context/AppStateContext';
import { todayFormatted } from '../../../formatDate';
import { useRbac } from './useRbac';

function compact(value: string) {
  return value.replace(/\s+/g, '').trim();
}

export function useClientIntake() {
  const { data, addClient } = useAppState();
  const { can, deniedMessage } = useRbac();
  const shellConfig = data.shellConfig;

  const clients = data.clients;
  const [selectedClientId, setSelectedClientId] = useState(clients[0]?.id ?? '');

  // Auto-select first client when clients list changes and nothing is selected
  useEffect(() => {
    if (clients.length > 0 && !clients.some((c) => c.id === selectedClientId)) {
      setSelectedClientId(clients[0].id);
    }
  }, [clients, selectedClientId]);

  const selectedClient = useMemo(
    () => clients.find((client) => client.id === selectedClientId) ?? clients[0] ?? null,
    [clients, selectedClientId],
  );

  const [caseRef, setCaseRef] = useState('');
  const [selectedPersonaId, setSelectedPersonaId] = useState(shellConfig.personas[0]?.id ?? '');
  const [profileValues, setProfileValues] = useState<Record<string, string>>({});
  const [intakeMessage, setIntakeMessage] = useState('');

  useEffect(() => {
    if (!shellConfig.personas.some((persona) => persona.id === selectedPersonaId)) {
      setSelectedPersonaId(shellConfig.personas[0]?.id ?? '');
    }
  }, [shellConfig.personas, selectedPersonaId]);

  const setProfileField = (fieldId: string, value: string) => {
    setProfileValues((current) => ({ ...current, [fieldId]: value }));
  };

  const createClient = () => {
    if (!can('client.intake')) {
      setIntakeMessage(deniedMessage('client.intake'));
      return;
    }

    const ref = caseRef.trim();

    const collectionLabel = shellConfig.collectionLabel ?? 'Collection';

    if (!ref) {
      setIntakeMessage(`${collectionLabel} reference ID is required.`);
      return;
    }

    for (const field of shellConfig.intakeFields) {
      const value = profileValues[field.id]?.trim();
      if (field.required && !value) {
        setIntakeMessage(`Field required: ${field.label}`);
        return;
      }
    }

    const activePersona = shellConfig.personas.find((persona) => persona.id === selectedPersonaId);
    const personaTags = activePersona?.defaultTags ?? [];

    // Derive display name from first two intake field values (industry-agnostic)
    const fieldValues = shellConfig.intakeFields.map((f) => profileValues[f.id]?.trim()).filter(Boolean);
    const derivedPrimary = fieldValues[0] || shellConfig.subjectSingular;
    const derivedSecondary = fieldValues[1]
      ? `${shellConfig.intakeFields[1]?.label ?? ''} ${fieldValues[1]}`.trim()
      : fieldValues.length > 0
        ? `${collectionLabel} Intake`
        : `New ${collectionLabel}`;

    const profileTags = shellConfig.intakeFields
      .map((field) => {
        const value = profileValues[field.id]?.trim();
        if (!value) {
          return undefined;
        }
        return `Profile:${compact(field.label)}:${compact(value)}`;
      })
      .filter((tag): tag is string => !!tag);

    const identityTag = `${collectionLabel}:${compact(`${derivedPrimary}${derivedSecondary}`)}`;
    const created = addClient({
      id: '',
      firstName: derivedPrimary,
      lastName: derivedSecondary,
      email: undefined,
      phone: undefined,
      caseRef: ref,
      personaId: activePersona?.id,
      profileData: profileValues,
      tags: [identityTag, `CaseRef:${compact(ref)}`, ...personaTags, ...profileTags],
      createdAt: todayFormatted(),
    });

    setSelectedClientId(created.id);
    setCaseRef('');
    setProfileValues({});
    setIntakeMessage(`${shellConfig.subjectSingular} intake saved. Record is ready for workspace management.`);
  };

  return {
    shellConfig,
    clients,
    selectedClient,
    selectedClientId,
    setSelectedClientId,
    caseRef,
    setCaseRef,
    selectedPersonaId,
    setSelectedPersonaId,
    profileValues,
    setProfileField,
    intakeMessage,
    createClient,
  };
}
