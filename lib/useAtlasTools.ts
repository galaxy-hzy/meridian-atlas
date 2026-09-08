'use client';
import { useEffect, useLayoutEffect, useRef } from 'react';
import { flushSync } from 'react-dom';
import { pointById, resolvePointId, type Point } from './atlas';
import { studyChannels as channels } from './luo';
type State = { selected: string | null; point: Point | null; hour: number };
type Tool = {
  name: string;
  description: string;
  inputSchema: object;
  annotations: { readOnlyHint: boolean; untrustedContentHint: boolean };
  execute: (input: unknown) => unknown;
};
export function useAtlasTools(
  state: State,
  actions: {
    selectChannel: (id: string) => void;
    setPoint: (p: Point) => void;
    moveHour: (h: number) => void;
  },
  enabled = true,
) {
  const latest = useRef({ state, actions });
  useLayoutEffect(() => {
    latest.current = { state, actions };
  });
  useEffect(() => {
    if (!enabled) return;
    const context = (
      document as Document & {
        modelContext?: {
          registerTool: (
            tool: Tool,
            options: { signal: AbortSignal },
          ) => void | Promise<void>;
        };
      }
    ).modelContext;
    if (!context?.registerTool) return;
    const controller = new AbortController();
    const result = () => ({
      channel: latest.current.state.selected,
      point: latest.current.state.point?.id || null,
      hour: latest.current.state.hour,
    });
    const parse = (v: unknown) => {
      if (!v || typeof v !== 'object' || Array.isArray(v))
        throw new Error('Expected an object');
      return v as Record<string, unknown>;
    };
    const tools: Tool[] = [
      {
        name: 'read_atlas_selection',
        description:
          'Read the currently selected channel, point and learning clock.',
        inputSchema: {
          type: 'object',
          properties: {},
          additionalProperties: false,
        },
        annotations: { readOnlyHint: true, untrustedContentHint: false },
        execute: () => result(),
      },
      {
        name: 'select_atlas_meridian',
        description: 'Select and illuminate one meridian in the visible atlas.',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', enum: [...channels.map((c) => c.id), 'EX'] },
          },
          required: ['id'],
          additionalProperties: false,
        },
        annotations: { readOnlyHint: false, untrustedContentHint: false },
        execute: (v) => {
          const p = parse(v);
          if (
            typeof p.id !== 'string' ||
            !['EX', ...channels.map((c) => c.id)].includes(p.id) ||
            Object.keys(p).length !== 1
          )
            throw new Error('Unknown meridian');
          flushSync(() => latest.current.actions.selectChannel(p.id as string));
          return result();
        },
      },
      {
        name: 'inspect_atlas_point',
        description:
          'Open point information. Full detail requires selecting its meridian first, as in the visible UI.',
        inputSchema: {
          type: 'object',
          properties: { id: { type: 'string' } },
          required: ['id'],
          additionalProperties: false,
        },
        annotations: { readOnlyHint: false, untrustedContentHint: false },
        execute: (v) => {
          const p = parse(v);
          const id = typeof p.id === 'string' ? resolvePointId(p.id) : null;
          if (!id || Object.keys(p).length !== 1)
            throw new Error('Unknown point');
          flushSync(() => latest.current.actions.setPoint(pointById[id]));
          return result();
        },
      },
      {
        name: 'set_atlas_learning_hour',
        description:
          'Set the simulated learning clock and select its traditional two-hour meridian.',
        inputSchema: {
          type: 'object',
          properties: {
            hour: { type: 'number', minimum: 0, exclusiveMaximum: 24 },
          },
          required: ['hour'],
          additionalProperties: false,
        },
        annotations: { readOnlyHint: false, untrustedContentHint: false },
        execute: (v) => {
          const p = parse(v);
          if (
            typeof p.hour !== 'number' ||
            !Number.isFinite(p.hour) ||
            p.hour < 0 ||
            p.hour >= 24 ||
            Object.keys(p).length !== 1
          )
            throw new Error('Hour must be in [0,24)');
          flushSync(() => latest.current.actions.moveHour(p.hour as number));
          return result();
        },
      },
    ];
    for (const tool of tools) {
      try {
        void Promise.resolve(
          context.registerTool(tool, { signal: controller.signal }),
        ).catch(() => {});
      } catch {
        /* Unsupported experimental context does not disable the atlas. */
      }
    }
    return () => controller.abort();
  }, [enabled]);
}
