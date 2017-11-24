import React from 'react';
import { XMap, XObject, XStrip, XComponent } from './XObject';
import { db, Models, Collection } from './db';
import { PropertyField, EntitySelector } from './UI';
import juration from './juration';
import _ from 'lodash';

export class WorkDay extends XComponent {
	constructor() {
		super({
		});
	}
	xRender() {
		var end = this.props.workDay.end || new Date();
		var timeSpent = db.work_log_entries.filter((workLogEntry) => {
			return workLogEntry.start.isBetween(this.props.workDay.begin, end);
		}).reduce((timeSpent, entry) => {
			return timeSpent + (entry.end || new Date()).getTime() - entry.start.getTime();
		}, 0);
		return (
			<div>
				<div>Begin: <PropertyField object={this.props.workDay} property="begin" type="datetime" /></div>
				<div>End: <PropertyField object={this.props.workDay} property="end" type="datetime" /></div>

				{juration.stringify(Math.floor(timeSpent/1000))}
			</div>
		);
	}
}
