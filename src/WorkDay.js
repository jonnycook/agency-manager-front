import React from 'react';
import { XMap, XObject, XStrip, XComponent } from './XObject';
import { db, Models, Collection } from './db';
import { PropertyField, EntitySelector } from './UI';
import juration from './juration';
import _ from 'lodash';

export class WorkDay extends XComponent {
	constructor() {
		super({
			actions: {
				deleteEntry() {

				}
			}
		});
	}

	log() {
		var end = this.props.workDay.end || new Date();
		return db.work_log_entries.filter((workLogEntry) => {
			return workLogEntry.start.isBetween(this.props.workDay.begin, end);
		});
	}
	xRender() {
		var timeSpent = Math.floor(this.log().reduce((timeSpent, entry) => {
			return timeSpent + (entry.end || new Date()).getTime() - entry.start.getTime();
		}, 0)/1000);
		var timeSinceStarted = this.props.workDay.begin ? Math.floor((new Date().getTime() - this.props.workDay.begin.getTime())/1000) : 0;
		var distractionTime = timeSinceStarted - timeSpent;
		return (
			<div>
				<div>Begin: <PropertyField object={this.props.workDay} property="begin" type="datetime" /></div>
				<div>End: <PropertyField object={this.props.workDay} property="end" type="datetime" /></div>
				<div>Time: <PropertyField object={this.props.workDay} property="time" type="duration" /></div>
				<div>Distraction Time: <PropertyField object={this.props.workDay} property="distractionTime" type="duration" /></div>

				<div>Time Spent Working: {juration.stringify(timeSpent)}</div>
				<div>Time Since Started: {juration.stringify(timeSinceStarted)}</div>
				{this.props.workDay.distractionTime ? <div>
					<div>Distraction Time: {juration.stringify(distractionTime)}/{juration.stringify(this.props.workDay.distractionTime)} ({juration.stringify(this.props.workDay.distractionTime - distractionTime)})</div>
				</div> : <div>Distraction Time: {juration.stringify(distractionTime)}</div>}

				{this.props.workDay.time &&
					<div>
						<div>Time left: {juration.stringify(this.props.workDay.time - timeSpent)}</div>
						<div>Time When Finished: {new Date(new Date().getTime() + ((this.props.workDay.time - timeSpent) + (this.props.workDay.distractionTime ? Math.max(0, this.props.workDay.distractionTime - distractionTime) : 0))*1000).toString()}</div>
					</div>
				}

				<h2>Log</h2>
				<ul>
					{this.log().map(entry => {
						return (
							<li key={entry._id}>
								<div>
									<label>Subject: </label>
									<PropertyField type="entity" object={entry} property="subject" />
								</div>
								<div>
									<label>Description: </label>
									<PropertyField type="text" object={entry} property="description" />
								</div>
								<div>
									<label>Start: </label>
									<PropertyField type="datetime" object={entry} property="start" />
								</div>
								<div>
									<label>End: </label>
									<PropertyField type="datetime" object={entry} property="end" />
								</div>
								<div>
									<label>Activity: </label>
									<PropertyField type="text" object={entry} property="activity.activity" />
								</div>

								{entry.activity.object.entity && <div>
									<label>Object Entity: </label>
									<PropertyField type="entity" object={entry} property="activity.object.entity" />
								</div>}

								<button onClick={this.actions.deleteEntry.bind(entry)}>Delete</button>
							</li>
						);
					})}
				</ul>


			</div>
		);
	}
}
