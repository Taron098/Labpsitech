import { Component, OnDestroy } from '@angular/core';
import * as L from 'leaflet';

import * as _ from 'underscore';
import 'style-loader!leaflet/dist/leaflet.css';
import { LeafletService } from './leaflet.service';
import { UserService } from '../../../@core/data/user.service';
import { IMyDateRangeModel, IMyDrpOptions } from 'mydaterangepicker';

const openStreetMap = L.tileLayer('http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {maxZoom: 20, attribution: '...'});
const googleHybrid = L.tileLayer('http://{s}.google.com/vt/lyrs=s,h&x={x}&y={y}&z={z}', {maxZoom: 20, subdomains: [ 'mt0', 'mt1', 'mt2', 'mt3']});
const LeafIcon = L.Icon.extend({
  options: {
    shadowUrl: 'leaf-shadow.png',
    iconSize:     [38, 95],
    iconAnchor:   [22, 94]
  }
});
@Component({
  selector: 'ngx-leaflet',
  styleUrls: ['./leaflet.component.scss'],
  templateUrl: './leaflet.component.html',
})

export class LeafletComponent implements OnDestroy {
  public myDateRangePickerOptions: IMyDrpOptions = {
    dateFormat: 'dd.mm.yyyy',
    showSelectDateText: true,
    height: '34px',
    selectionTxtFontSize: '14px',
    disableUntil: {year: 9999, month: 12, day: 31},
    enableDates: [],
  };
  public model: any;

  polylines: any;
  currentUser: string;
  batch = ['0-24', '0-8', '8-16', '16-24'];
  batchValue: string = this.batch[0];
  labels: any[] = [];
  map: L.Map;
  latlngs = [];
  curLoc = [];
  layersControl =  {
    baseLayers: {
      'Open Street Map': openStreetMap,
      'Google Hybrid': googleHybrid,
    },
  };
  options = {
    layers: [
      openStreetMap,
    ],
    zoom: 14,
    center: L.latLng({lat: 39.983, lng: -0.033}),
    keyboard: false
  };
  layers = [];
  userDatas = [];

  constructor(public leafletService: LeafletService, private userService: UserService) {

    this.currentUser = localStorage.getItem('selectedUser');
  }

  onDateRangeChanged(event: IMyDateRangeModel) {
    const range = {start: event.beginDate, end: event.endDate};
    this.userService.setUserTime(range);
    this.getTotalPath();
    this.getCurrentLocation(event);
  }

  onReadyMap(map: L.Map) {
    this.map = map;
    L.control.scale().addTo(this.map);
    this.drawRadius();
    this.userService.getTime(this.currentUser).subscribe((timeRange) => {
      timeRange.forEach((time) => {
        this.myDateRangePickerOptions.enableDates.push(time)
      });
      this.model = {
        beginDate: this.myDateRangePickerOptions.enableDates[0],
        endDate: this.myDateRangePickerOptions.enableDates[this.myDateRangePickerOptions.enableDates.length - 1]
      };
      this.onDateRangeChanged(this.model);
    });
  }

  getUserLatLngs(e) {
    e.stopPropagation();

    this.leafletService.getUsersConfigData(this.currentUser).subscribe((result) => {
      _.sortBy(result.locations, 'time');
      if (result.locations.length) {
        for (let i = 0; i < result.locations.length; i++) {
          this.latlngs.push([
            result.locations[i].lat,
            result.locations[i].lon,
          ]);
        }
      }
      this.map.addLayer(L.polyline([...this.latlngs]));
    });
  }

  getCurrentLocation(event) {
    // e.stopPropagation();
    this.leafletService.getUsersConfigData(this.currentUser).subscribe((result) => {
      _.sortBy(result.locations, 'time');
      if (result.locations.length) {
        this.curLoc.push([
          result.locations[0].lat,
          result.locations[0].lon,
        ]);
        this.map.setView(new L.LatLng(result.locations[0].lat, result.locations[0].lon), 16);
        L.marker([this.curLoc[0][0], this.curLoc[0][1]], {
          icon: L.icon({
            iconSize: [55, 95],
            iconAnchor: [22, 94],
            iconUrl: 'assets/images/red.png',
          }),
        }).addTo(this.map).bindPopup('Starting point');
      }
    });
  }

  getTotalPath() {
    // e.stopPropagation();
    const time = this.userService.getUserTime();
    this.userService.getTotalLocations(this.currentUser, time).subscribe((result) => {

      this.latlngs = [];
      if (result.locations.length) {
        for (let i = 0; i < result.locations.length; i++) {
          this.latlngs.push([
            result.locations[i].lat,
            result.locations[i].lon,
          ]);
        }
      }
      if (this.polylines) {
        this.map.removeLayer(this.polylines);
      }
      this.polylines = L.polyline([...this.latlngs]);
      this.map.addLayer(this.polylines);
    });
  }
  setView() {
    const fitBound = L.polyline([...this.latlngs]);
    const bounds = fitBound.getBounds();
    this.map.fitBounds(bounds);
  }

  getBatchPath() {
    const time = this.userService.getUserTime();
    this.userService.getBatchLocations(this.currentUser, time, this.batchValue).subscribe((result) => {

      this.latlngs = [];
      if (result.locations.length) {
        for (let i = 0; i < result.locations.length; i++) {
          this.latlngs.push([
            result.locations[i].lat,
            result.locations[i].lon,
          ]);
        }
      }
      if (this.polylines) {
        this.map.removeLayer(this.polylines);
      }
      this.polylines = L.polyline([...this.latlngs]);
      this.map.addLayer(this.polylines);
    });
  }

  chooseBatch() {
    if (this.batchValue) {
      return this.getBatchPath();
    }
  }

  drawRadius() {
    if (this.currentUser) {
      let radius = 0;
      this.userService.getUsersRadius(this.currentUser).subscribe((data) => {
        radius = data;
      });
      this.userService.getUsersConfigLoc(this.currentUser).subscribe((res) => {
        L.circle([res[0], res[1]], {radius: radius}).addTo(this.map);
        this.map.setView(new L.LatLng(res[0], res[1]), 16);
        L.marker([res[0], res[1]], {
          icon: L.icon({
            iconSize: [38, 75],
            iconAnchor: [22, 90],
            iconUrl: 'assets/images/Location.png',
          }),
        }).addTo(this.map).bindPopup('Home');
        // L.circle([39.48621581697988, -0.3582797572016716], {radius: 40}).addTo(this.map);
        // this.map.setView(new L.LatLng(39.48621581697988, -0.3582797572016716), 16);
      });
    }
  }
  ngOnDestroy() {
    this.map.remove();
  }
}

