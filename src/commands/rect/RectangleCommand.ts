import * as THREE from "three";
import Command from "../../command/Command";
import { PointPicker, PointPickerOptions, PointResult } from "../../command/point-picker/PointPicker";
import { AxisSnap } from "../../editor/snaps/Snap";
import * as visual from "../../visual_model/VisualModel";
import LineFactory from '../line/LineFactory';
import { CenterRectangleFactory, CornerRectangleFactory, ThreePointRectangleFactory } from './RectangleFactory';
import { RectangleModeKeyboardGizmo } from "./RectangleModeKeyboardGizmo";

export class ThreePointRectangleCommand extends Command {
    async execute(): Promise<void> {
        const pointPicker = new PointPicker(this.editor);

        const line = new LineFactory(this.editor.db, this.editor.materials, this.editor.signals).resource(this);
        const { point: p1 } = await pointPicker.execute().resource(this);
        line.p1 = p1;
        const { point: p2 } = await pointPicker.execute(({ point: p2 }) => {
            line.p2 = p2;
            line.update();
        }).resource(this);
        line.cancel();

        const rect = new ThreePointRectangleFactory(this.editor.db, this.editor.materials, this.editor.signals).resource(this);
        rect.constructionPlane = this.editor.activeViewport?.constructionPlane;
        rect.p1 = p1;
        rect.p2 = p2;
        await pointPicker.execute(({ point: p3 }) => {
            rect.p3 = p3;
            rect.update();
        }).resource(this);

        const result = await rect.commit() as visual.SpaceInstance<visual.Curve3D>;
        this.editor.selection.selected.addCurve(result);
    }
}

export class CornerRectangleCommand extends Command {
    pr1?: PointResult;
    pr2?: PointResult;

    async execute(): Promise<void> {
        const rect = new CornerRectangleFactory(this.editor.db, this.editor.materials, this.editor.signals).resource(this);
        rect.constructionPlane = this.editor.activeViewport?.constructionPlane;
        let { pr1, pr2 } = this;

        const pointPicker = new PointPicker(this.editor);
        pointPicker.facePreferenceMode = 'strong';
        pointPicker.straightSnaps.delete(AxisSnap.X);
        pointPicker.straightSnaps.delete(AxisSnap.Y);
        pointPicker.straightSnaps.delete(AxisSnap.Z);
        pointPicker.straightSnaps.add(new AxisSnap("Square", new THREE.Vector3(1, 1, 0)));
        pointPicker.straightSnaps.add(new AxisSnap("Square", new THREE.Vector3(1, -1, 0)));

        const { point: p1, info: { snap } } = pr1 = await pointPicker.execute({ result: pr1 }).resource(this);
        pointPicker.restrictToPlaneThroughPoint(p1, snap);
        rect.p1 = p1;

        const keyboard = new RectangleModeKeyboardGizmo(this.editor);
        keyboard.execute(e => {
            switch (e) {
                case 'mode':
                    const command = new CenterRectangleCommand(this.editor);
                    command.pr1 = pr1;
                    command.pr2 = pr2;
                    this.editor.enqueue(command, true);
            }
        }).resource(this);

        await pointPicker.execute(result => {
            const { point: p2, info: { orientation } } = pr2 = result;
            rect.p2 = p2;
            rect.orientation = orientation;
            rect.update();
        }, { result: pr2 }).resource(this);

        const result = await rect.commit() as visual.SpaceInstance<visual.Curve3D>;
        this.editor.selection.selected.addCurve(result);
    }
}

export class CenterRectangleCommand extends Command {
    pr1?: PointResult;
    pr2?: PointResult;

    async execute(): Promise<void> {
        const rect = new CenterRectangleFactory(this.editor.db, this.editor.materials, this.editor.signals).resource(this);
        rect.constructionPlane = this.editor.activeViewport?.constructionPlane;
        let { pr1, pr2 } = this;

        const pointPicker = new PointPicker(this.editor);
        pointPicker.facePreferenceMode = 'strong';
        pointPicker.straightSnaps.delete(AxisSnap.X);
        pointPicker.straightSnaps.delete(AxisSnap.Y);
        pointPicker.straightSnaps.delete(AxisSnap.Z);
        pointPicker.straightSnaps.add(new AxisSnap("Square", new THREE.Vector3(1, 1, 0)));
        pointPicker.straightSnaps.add(new AxisSnap("Square", new THREE.Vector3(1, -1, 0)));

        const { point: p1, info: { snap } } = pr1 = await pointPicker.execute({ result: pr1 }).resource(this);
        rect.p1 = p1;
        pointPicker.restrictToPlaneThroughPoint(p1, snap);

        const keyboard = new RectangleModeKeyboardGizmo(this.editor);
        keyboard.execute(e => {
            switch (e) {
                case 'mode':
                    const command = new CornerRectangleCommand(this.editor);
                    command.pr1 = pr1;
                    command.pr2 = pr2;
                    this.editor.enqueue(command, true);
            }
        }).resource(this);

        await pointPicker.execute(result => {
            const { point: p2, info: { orientation } } = pr2 = result;
            rect.p2 = p2;
            rect.orientation = orientation;
            rect.update();
        }, { result: pr2 }).resource(this);

        const result = await rect.commit() as visual.SpaceInstance<visual.Curve3D>;
        this.editor.selection.selected.addCurve(result);
    }
}