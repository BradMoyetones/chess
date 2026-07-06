// tests/core/EventBus.test.ts
import { describe, it, expect, vi } from 'vitest';
import { EventBus } from '../../src/Core/EventBus';

describe('EventBus', () => {
    it('should emit and receive events', () => {
        const bus = new EventBus();
        const handler = vi.fn();

        bus.on('PIECE_MOVED', handler);
        bus.emit('PIECE_MOVED', { from: 'e2', to: 'e4', piece: 'p' });

        expect(handler).toHaveBeenCalledOnce();
        expect(handler).toHaveBeenCalledWith({ from: 'e2', to: 'e4', piece: 'p' });
    });

    it('should support multiple listeners for the same event', () => {
        const bus = new EventBus();
        const handler1 = vi.fn();
        const handler2 = vi.fn();

        bus.on('CHECK', handler1);
        bus.on('CHECK', handler2);
        bus.emit('CHECK', { kingColor: 'w' });

        expect(handler1).toHaveBeenCalledOnce();
        expect(handler2).toHaveBeenCalledOnce();
    });

    it('should unsubscribe with off()', () => {
        const bus = new EventBus();
        const handler = vi.fn();

        bus.on('PIECE_MOVED', handler);
        bus.off('PIECE_MOVED', handler);
        bus.emit('PIECE_MOVED', { from: 'e2', to: 'e4', piece: 'p' });

        expect(handler).not.toHaveBeenCalled();
    });

    it('should fire once() listener only one time', () => {
        const bus = new EventBus();
        const handler = vi.fn();

        bus.once('BOARD_UPDATED', handler);
        bus.emit('BOARD_UPDATED', {});
        bus.emit('BOARD_UPDATED', {});

        expect(handler).toHaveBeenCalledOnce();
    });

    it('should remove all listeners for a specific event', () => {
        const bus = new EventBus();
        const handler1 = vi.fn();
        const handler2 = vi.fn();

        bus.on('CHECK', handler1);
        bus.on('CHECK', handler2);
        bus.removeAllListeners('CHECK');
        bus.emit('CHECK', { kingColor: 'b' });

        expect(handler1).not.toHaveBeenCalled();
        expect(handler2).not.toHaveBeenCalled();
    });

    it('should remove ALL listeners when no event specified', () => {
        const bus = new EventBus();
        const moveHandler = vi.fn();
        const checkHandler = vi.fn();

        bus.on('PIECE_MOVED', moveHandler);
        bus.on('CHECK', checkHandler);
        bus.removeAllListeners();
        bus.emit('PIECE_MOVED', { from: 'e2', to: 'e4', piece: 'p' });
        bus.emit('CHECK', { kingColor: 'w' });

        expect(moveHandler).not.toHaveBeenCalled();
        expect(checkHandler).not.toHaveBeenCalled();
    });

    it('should not crash when emitting event with no listeners', () => {
        const bus = new EventBus();
        expect(() => bus.emit('BOARD_UPDATED', {})).not.toThrow();
    });
});
