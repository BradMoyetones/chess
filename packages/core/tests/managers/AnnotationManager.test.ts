// tests/managers/AnnotationManager.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AnnotationManager } from '../../src/Managers/AnnotationManager';
import { EventBus } from '../../src/Core/EventBus';
import { Container } from '../../src/Decorators/di.decorators';

describe('AnnotationManager', () => {
    let manager: AnnotationManager;
    let eventBus: EventBus;

    beforeEach(() => {
        Container.clear();
        eventBus = Container.resolve(EventBus);
        manager = Container.resolve(AnnotationManager);
    });

    it('should add an arrow annotation', () => {
        const id = manager.addArrow('g1', 'f3', 'green');
        const annotations = manager.getAnnotations();

        expect(annotations).toHaveLength(1);
        expect(annotations[0]).toMatchObject({
            type: 'arrow',
            from: 'g1',
            to: 'f3',
            color: 'green'
        });
        expect(id).toBeTruthy();
    });

    it('should add a circle annotation', () => {
        manager.addCircle('d4', 'red');
        const annotations = manager.getAnnotations();

        expect(annotations).toHaveLength(1);
        expect(annotations[0]).toMatchObject({
            type: 'circle',
            square: 'd4',
            color: 'red'
        });
    });

    it('should add a highlight annotation', () => {
        manager.addHighlight('e5', '#ff0000');
        const annotations = manager.getAnnotations();

        expect(annotations).toHaveLength(1);
        expect(annotations[0]).toMatchObject({
            type: 'highlight',
            square: 'e5',
            backgroundColor: '#ff0000'
        });
    });

    it('should remove an annotation by ID', () => {
        const id = manager.addArrow('a1', 'h8');
        expect(manager.getAnnotations()).toHaveLength(1);

        manager.removeAnnotation(id);
        expect(manager.getAnnotations()).toHaveLength(0);
    });

    it('should clear all annotations', () => {
        manager.addArrow('a1', 'h8');
        manager.addCircle('d4');
        manager.addHighlight('e5', '#ff0000');

        manager.clearAll();
        expect(manager.getAnnotations()).toHaveLength(0);
    });

    it('should toggle arrow: add then remove', () => {
        manager.toggleArrow('g1', 'f3');
        expect(manager.getAnnotations()).toHaveLength(1);

        manager.toggleArrow('g1', 'f3');
        expect(manager.getAnnotations()).toHaveLength(0);
    });

    it('should toggle circle: add then remove', () => {
        manager.toggleCircle('d4');
        expect(manager.getAnnotations()).toHaveLength(1);

        manager.toggleCircle('d4');
        expect(manager.getAnnotations()).toHaveLength(0);
    });

    it('should emit events on add/remove/clear', () => {
        const addHandler = vi.fn();
        const removeHandler = vi.fn();
        const clearHandler = vi.fn();

        eventBus.on('ANNOTATION_ADDED', addHandler);
        eventBus.on('ANNOTATION_REMOVED', removeHandler);
        eventBus.on('ANNOTATIONS_CLEARED', clearHandler);

        const id = manager.addArrow('a1', 'h8');
        expect(addHandler).toHaveBeenCalledOnce();

        manager.removeAnnotation(id);
        expect(removeHandler).toHaveBeenCalledOnce();

        manager.addCircle('d4');
        manager.clearAll();
        expect(clearHandler).toHaveBeenCalledOnce();
    });

    it('should get annotations for a specific square', () => {
        manager.addArrow('e2', 'e4');
        manager.addCircle('e2');
        manager.addArrow('d1', 'h5');

        const forE2 = manager.getAnnotationsForSquare('e2');
        expect(forE2).toHaveLength(2); // arrow (from e2) + circle
    });
});
