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
		var timeSpent = Math.floor(db.work_log_entries.filter((workLogEntry) => {
			return workLogEntry.start.isBetween(this.props.workDay.begin, end);
		}).reduce((timeSpent, entry) => {
			return timeSpent + (entry.end || new Date()).getTime() - entry.start.getTime();
		}, 0)/1000);
		var timeSinceStarted = Math.floor((new Date().getTime() - this.props.workDay.begin.getTime())/1000);
		return (
			<div>
				<div>Begin: <PropertyField object={this.props.workDay} property="begin" type="datetime" /></div>
				<div>End: <PropertyField object={this.props.workDay} property="end" type="datetime" /></div>
				<div>Time: <PropertyField object={this.props.workDay} property="time" type="duration" /></div>

				<div>{juration.stringify(timeSpent)}</div>
				<div>Time Since Started: {juration.stringify(timeSinceStarted)}</div>
				<div>Other Time: {juration.stringify(timeSinceStarted - timeSpent)}</div>

				{this.props.workDay.time &&
					<div>
						<div>Time left: {juration.stringify(this.props.workDay.time - timeSpent)}</div>
						<div>Time When Finished: {new Date(new Date().getTime() + (this.props.workDay.time - timeSpent)*1000).toString()}</div>
					</div>
				}
			</div>
		);
	}
}
