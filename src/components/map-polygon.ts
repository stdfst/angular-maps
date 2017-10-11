﻿import {
    Directive, Input, Output, OnDestroy, OnChanges, ViewContainerRef,
    EventEmitter, ContentChild, AfterContentInit, SimpleChanges
} from '@angular/core';
import { Subscription } from 'rxjs/subscription';
import { IPolygonOptions } from '../interfaces/ipolygon-options';
import { IPoint } from '../interfaces/ipoint';
import { ILatLong } from '../interfaces/ilatlong';
import { PolygonService } from '../services/polygon.service';
import { InfoBoxComponent } from './infobox';

let polygonId = 0;

/**
 *
 * MapPolygonDirective renders a polygon inside a {@link MapComponent}.
 *
 * ### Example
 * ```typescript
 * import {Component} from '@angular/core';
 * import {MapComponent, MapPolygonDirective} from '...';
 *
 * @Component({
 *  selector: 'my-map,
 *  styles: [`
 *   .map-container { height: 300px; }
 * `],
 * template: `
 *   <x-map [Latitude]="lat" [Longitude]="lng" [Zoom]="zoom">
 *      <x-map-polygon [Paths]="path"></x-map-polygon>
 *   </x-map>
 * `
 * })
 * ```
 *
 *
 * @export
 * @class MapPolygonDirective
 * @implements {OnDestroy}
 * @implements {OnChanges}
 * @implements {AfterContentInit}
 */
@Directive({
    selector: 'x-map-polygon'
})
export class MapPolygonDirective implements OnDestroy, OnChanges, AfterContentInit {

    ///
    /// Field declarations
    ///
    private _inCustomLayer = false;
    private _id: number;
    private _layerId: number;
    private _addedToService = false;
    private _events: Subscription[] = [];

    ///
    /// Any InfoBox that is a direct children of the polygon
    ///
    @ContentChild(InfoBoxComponent) protected _infoBox: InfoBoxComponent;


    /**
     * Gets or sets whether this Polygon handles mouse events.
     *
     * @type {boolean}
     * @memberof MapPolygonDirective
     */
    @Input() public Clickable = true;

    /**
     * If set to true, the user can drag this shape over the map.
     *
     * @type {boolean}
     * @memberof MapPolygonDirective
     */
    @Input() public Draggable = false;

    /**
     * If set to true, the user can edit this shape by dragging the control
     * points shown at the vertices and on each segment.
     *
     * @type {boolean}
     * @memberof MapPolygonDirective
     */
    @Input() public Editable = false;

    /**
     * The fill color of the polygon.
     *
     * @type {string}
     * @memberof MapPolygonDirective
     */
    @Input() public FillColor: string;

    /**
     * The fill opacity between 0.0 and 1.0
     *
     * @type {number}
     * @memberof MapPolygonDirective
     */
    @Input() public FillOpacity: number;

    /**
     * When true, edges of the polygon are interpreted as geodesic and will
     * follow the curvature of the Earth. When false, edges of the polygon are
     * rendered as straight lines in screen space. Note that the shape of a
     * geodesic polygon may appear to change when dragged, as the dimensions
     * are maintained relative to the surface of the earth. Defaults to false.
     *
     * @type {boolean}
     * @memberof MapPolygonDirective
     */
    @Input() public Geodesic = false;

    /**
     * Set the maximum zoom at which the polygon lable is visible. Ignored if ShowLabel is false.
     * @type {number}
     * @memberof MapPolygonDirective
     */
    @Input() public LabelMaxZoom: number;

    /**
     * Set the minimum zoom at which the polygon lable is visible. Ignored if ShowLabel is false.
     * @type {number}
     * @memberof MapPolygonDirective
     */
    @Input() public LabelMinZoom: number;

    /**
     * The ordered sequence of coordinates that designates a closed loop.
     * Unlike polylines, a polygon may consist of one or more paths.
     * As a result, the paths property may specify one or more arrays of
     * LatLng coordinates. Paths are closed automatically; do not repeat the
     * first vertex of the path as the last vertex. Simple polygons may be
     * defined using a single array of LatLngs. More complex polygons may
     * specify an array of arrays (for inner loops ). Any simple arrays are converted into Arrays.
     * Inserting or removing LatLngs from the Array will automatically update
     * the polygon on the map.
     *
     * @type {(Array<ILatLong> | Array<Array<ILatLong>>|Array<Array<Array<ILatLong)}
     * @memberof MapPolygonDirective
     */
    @Input() public Paths: Array<ILatLong> | Array<Array<ILatLong>> = [];

    /**
     * Whether to show the title as the label on the polygon.
     *
     * @type {boolean}
     * @memberof MapPolygonDirective
     */
    @Input() public ShowLabel: boolean;

    /**
     * Whether to show the title of the polygon as the tooltip on the polygon.
     *
     * @type {boolean}
     * @memberof MapPolygonDirective
     */
    @Input() public ShowTooltip: boolean = true;

    /**
     * The stroke color.
     *
     * @type {string}
     * @memberof MapPolygonDirective
     */
    @Input() public StrokeColor: string;

    /**
     * The stroke opacity between 0.0 and 1.0
     *
     * @type {number}
     * @memberof MapPolygonDirective
     */
    @Input() public StrokeOpacity: number;

    /**
     * The stroke width in pixels.
     *
     * @type {number}
     * @memberof MapPolygonDirective
     */
    @Input() public StrokeWeight: number;

    /**
     * The title of the polygon.
     *
     * @type {string}
     * @memberof MapPolygonDirective
     */
    @Input() public Title: string;

    /**
     * Whether this polygon is visible on the map. Defaults to true.
     *
     * @type {boolean}
     * @memberof MapPolygonDirective
     */
    @Input() public Visible: boolean;

    /**
     * The zIndex compared to other polys.
     *
     * @type {number}
     * @memberof MapPolygonDirective
     */
    @Input() public zIndex: number;

    ///
    /// Delegate definitions
    ///

    /**
     * This event is fired when the DOM click event is fired on the Polygon.
     *
     *   @type {EventEmitter<MouseEvent>}
     * @memberof MapPolygonDirective
     */
    @Output() Click: EventEmitter<MouseEvent> = new EventEmitter<MouseEvent>();

    /**
     * This event is fired when the DOM dblclick event is fired on the Polygon.
     *
     * @type {EventEmitter<MouseEvent>}
     * @memberof MapPolygonDirective
     */
    @Output() DblClick: EventEmitter<MouseEvent> = new EventEmitter<MouseEvent>();

    /**
     * This event is repeatedly fired while the user drags the polygon.
     *
     * @type {EventEmitter<MouseEvent>}
     * @memberof MapPolygonDirective
     */
    @Output() Drag: EventEmitter<MouseEvent> = new EventEmitter<MouseEvent>();

    /**
     * This event is fired when the user stops dragging the polygon.
     *
     * @type {EventEmitter<MouseEvent>}
     * @memberof MapPolygonDirective
     */
    @Output() DragEnd: EventEmitter<MouseEvent> = new EventEmitter<MouseEvent>();

    /**
     * This event is fired when the user starts dragging the polygon.
     *
     * @type {EventEmitter<MouseEvent>}
     * @memberof MapPolygonDirective
     */
    @Output() DragStart: EventEmitter<MouseEvent> = new EventEmitter<MouseEvent>();

    /**
     * This event is fired when the DOM mousedown event is fired on the Polygon.
     *
     * @type {EventEmitter<MouseEvent>}
     * @memberof MapPolygonDirective
     */
    @Output() MouseDown: EventEmitter<MouseEvent> = new EventEmitter<MouseEvent>();

    /**
     * This event is fired when the DOM mousemove event is fired on the Polygon.
     *
     * @type {EventEmitter<MouseEvent>}
     * @memberof MapPolygonDirective
     */
    @Output() MouseMove: EventEmitter<MouseEvent> = new EventEmitter<MouseEvent>();

    /**
     * This event is fired on Polygon mouseout.
     *
     * @type {EventEmitter<MouseEvent>}
     * @memberof MapPolygonDirective
     */
    @Output() MouseOut: EventEmitter<MouseEvent> = new EventEmitter<MouseEvent>();

    /**
     * This event is fired on Polygon mouseover.
     *
     * @type {EventEmitter<MouseEvent>}
     * @memberof MapPolygonDirective
     */
    @Output() MouseOver: EventEmitter<MouseEvent> = new EventEmitter<MouseEvent>();

    /**
     * This event is fired whe the DOM mouseup event is fired on the Polygon
     *
     * @type {EventEmitter<MouseEvent>}
     * @memberof MapPolygonDirective
     */
    @Output() MouseUp: EventEmitter<MouseEvent> = new EventEmitter<MouseEvent>();


    /**
     * This event is fired when the Polygon is right-clicked on.
     *
     * @type {EventEmitter<MouseEvent>}
     * @memberof MapPolygonDirective
     */
    @Output() RightClick: EventEmitter<MouseEvent> = new EventEmitter<MouseEvent>();

    /**
     * This event is fired when editing has completed.
     *
     * @type {EventEmitter<Array<ILatLong> | Array<Array<ILatLong>>>}
     * @memberof MapPolygonDirective
     */
    @Output() PathChanged: EventEmitter<Array<ILatLong> | Array<Array<ILatLong>>>
        = new EventEmitter<Array<ILatLong> | Array<Array<ILatLong>>>();

    ///
    /// Property declarations
    ///

    /**
     * Gets whether the polygon has been registered with the service.
     * @readonly
     * @type {boolean}
     * @memberof MapPolygonDirective
     */
    public get AddedToService(): boolean { return this._addedToService; }

    /**
     * Get the id of the polygon.
     *
     * @readonly
     * @type {number}
     * @memberof MapPolygonDirective
     */
    public get Id(): number { return this._id; }

    /**
     * Gets the id of the polygon as a string.
     *
     * @readonly
     * @type {string}
     * @memberof MapPolygonDirective
     */
    public get IdAsString(): string { return this._id.toString(); }

    /**
     * Gets whether the polygon is in a custom layer. See {@link MapLayer}.
     *
     * @readonly
     * @type {boolean}
     * @memberof MapPolygonDirective
     */
    public get InCustomLayer(): boolean { return this._inCustomLayer; }

    /**
     * gets the id of the Layer the polygon belongs to.
     *
     * @readonly
     * @type {number}
     * @memberof MapPolygonDirective
     */
    public get LayerId(): number { return this._layerId; }

    ///
    /// Constructor
    ///

    /**
     * Creates an instance of MapPolygonDirective.
     * @param {PolygonManager} _polygonManager
     *
     * @memberof MapPolygonDirective
     */
    constructor(private _polygonService: PolygonService, private _containerRef: ViewContainerRef) {
        this._id = polygonId++;
    }

    ///
    /// Public methods
    ///

    /**
     * Called after the content intialization of the directive is complete. Part of the ng Component life cycle.
     *
     * @return {void}
     *
     * @memberof MapPolygonDirective
     */
    ngAfterContentInit(): void {
        if (this._containerRef.element.nativeElement.parentElement) {
            const parentName: string = this._containerRef.element.nativeElement.parentElement.tagName;
            if (parentName.toLowerCase() === 'x-map-layer') {
                this._inCustomLayer = true;
                this._layerId = Number(this._containerRef.element.nativeElement.parentElement.attributes['layerId']);
            }
        }
        if (!this._addedToService) {
            this._polygonService.AddPolygon(this);
            this._addedToService = true;
            this.AddEventListeners();
        }
        return;
    }

    /**
     * Called when changes to the databoud properties occur. Part of the ng Component life cycle.
     *
     * @param {{ [propName: string]: SimpleChange }} changes - Changes that have occured.
     * @return {void}
     *
     * @memberof MapPolygonDirective
     */
    ngOnChanges(changes: SimpleChanges): any {
        if (!this._addedToService) { return; }

        const o: IPolygonOptions = this.GeneratePolygonChangeSet(changes);
        if (o != null) { this._polygonService.SetOptions(this, o); }
        if (changes['Paths'] && !changes['Paths'].isFirstChange()) {
            this._polygonService.UpdatePolygon(this);
        }

    }

    /**
     * Called when the poygon is being destroyed. Part of the ng Component life cycle. Release resources.
     *
     *
     * @memberof MapPolygonDirective
     */
    ngOnDestroy() {
        this._polygonService.DeletePolygon(this);
        this._events.forEach((s) => s.unsubscribe());
        ///
        /// remove event subscriptions
        ///
    }

    ///
    /// Private methods
    ///

    /**
     * Wires up the event receivers.
     *
     * @private
     *
     * @memberof MapPolygonDirective
     */
    private AddEventListeners() {
        this._events.push(this._polygonService.CreateEventObservable('click', this).subscribe((ev: MouseEvent) => {
            const t: MapPolygonDirective = this;
            if (this._infoBox != null) {
                this._infoBox.Open(this._polygonService.GetCoordinatesFromClick(ev));
            }
        }));
        const handlers = [
            { name: 'click', handler: (ev: MouseEvent) => this.Click.emit(ev) },
            { name: 'dblclick', handler: (ev: MouseEvent) => this.DblClick.emit(ev) },
            { name: 'drag', handler: (ev: MouseEvent) => this.Drag.emit(ev) },
            { name: 'dragend', handler: (ev: MouseEvent) => this.DragEnd.emit(ev) },
            { name: 'dragstart', handler: (ev: MouseEvent) => this.DragStart.emit(ev) },
            { name: 'mousedown', handler: (ev: MouseEvent) => this.MouseDown.emit(ev) },
            { name: 'mousemove', handler: (ev: MouseEvent) => this.MouseMove.emit(ev) },
            { name: 'mouseout', handler: (ev: MouseEvent) => this.MouseOut.emit(ev) },
            { name: 'mouseover', handler: (ev: MouseEvent) => this.MouseOver.emit(ev) },
            { name: 'mouseup', handler: (ev: MouseEvent) => this.MouseUp.emit(ev) },
            { name: 'rightclick', handler: (ev: MouseEvent) => this.RightClick.emit(ev) },
            { name: 'pathchanged', handler: (ev: Array<ILatLong>) => this.PathChanged.emit(ev) }
        ];
        handlers.forEach((obj) => {
            const os = this._polygonService.CreateEventObservable(obj.name, this).subscribe(obj.handler);
            this._events.push(os);
        });
    }


    /**
     * Generates IPolygon option changeset from directive settings.
     *
     * @private
     * @param {SimpleChanges} changes - {@link SimpleChanges} identifying the changes that occured.
     * @returns {IPolygonOptions} - {@link IPolygonOptions} containing the polygon options.
     *
     * @memberof MapPolygonDirective
     */
    private GeneratePolygonChangeSet(changes: SimpleChanges): IPolygonOptions {
        const options: IPolygonOptions = { id: this._id };
        let hasOptions: boolean = false;
        if (changes['Clickable']) { options.clickable = this.Clickable; hasOptions = true; }
        if (changes['Draggable']) { options.draggable = this.Draggable; hasOptions = true; }
        if (changes['Editable']) { options.editable = this.Editable; hasOptions = true; }
        if (changes['FillColor']) { options.fillColor = this.FillColor; hasOptions = true; }
        if (changes['FillOpacity']) { options.fillOpacity = this.FillOpacity; hasOptions = true; }
        if (changes['Geodesic']) { options.geodesic = this.Geodesic; hasOptions = true; }
        if (changes['LabelMaxZoom']) { options.labelMaxZoom = this.LabelMaxZoom; hasOptions = true; }
        if (changes['LabelMinZoom']) { options.labelMinZoom = this.LabelMinZoom; hasOptions = true; }
        if (changes['ShowTooltip']) { options.showTooltip = this.ShowTooltip; hasOptions = true; }
        if (changes['ShowLabel']) { options.showLabel = this.ShowLabel; hasOptions = true; }
        if (changes['StrokeColor']) { options.strokeColor = this.StrokeColor; hasOptions = true; }
        if (changes['StrokeOpacity']) { options.strokeOpacity = this.StrokeOpacity; hasOptions = true; }
        if (changes['StrokeWeight']) { options.strokeWeight = this.StrokeWeight; hasOptions = true; }
        if (changes['Title']) { options.title = this.Title; hasOptions = true; }
        if (changes['Visible']) { options.visible = this.Visible; hasOptions = true; }
        if (changes['zIndex']) { options.zIndex = this.zIndex; hasOptions = true; }
        return hasOptions ? options : null;
    }

}
