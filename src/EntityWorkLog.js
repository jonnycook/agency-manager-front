import React from 'react';
import { XMap, XObject, XStrip, XComponent } from './XObject';
import { db, Models, Collection } from './db';
import { PropertyField, EntitySelector } from './UI';
import juration from 'juration';


import _ from 'lodash';

export class EntityWorkLog extends XComponent {
	constructor() {
		super({
			actions: {

			}
		});
	}
	totalTime() {
		var entity = this.props.entity;
		var entries = db.work_log_entries.filter((entry) => !entry.invoiced && entry.activity.object.entity === entity._id);
		var groups = {};
		
		var tasks = db.tasks.filter((task) => task.entity === entity._id);
		for (var task of tasks) {
			entries = entries.concat(db.work_log_entries.filter((entry) => entry.activity.object.task === task._id));
		}

		var issues = db.issues.filter((issue) => issue.entity === entity._id);
		for (var issue of issues) {
			entries = entries.concat(db.work_log_entries.filter((entry) => entry.activity.object.issue === issue._id));
		}

		var entriesToRemove = [];

		for (var entry of entries) {
			var group = db.work_log_entry_groups.find((group) => group.entries.includes(entry._id));
			if (group) {
				groups[group._id] = group;
				entriesToRemove.push(entry);
			}
		}

		for (var i of entriesToRemove) {
			entries.splice(entries.findIndex((j) => i._id === j._id), 1);
		}

		groups = Object.values(groups);

		var totalTime = 0;
		for (var entry of entries) {
			totalTime += (entry.end.getTime() - entry.start.getTime())/1000;
		}

		for (var group of groups) {
			if (group.timeOverride) {
				totalTime += group.timeOverride;
			}
			else {
				for (var entryId of group.entries) {
					let entry = Collection.findById('work_log_entries', entryId);
					totalTime += (entry.end.getTime() - entry.start.getTime())/1000;
				}
			}
		}

		var timeByActivity = {};

		for (var entry of entries) {
			if (!timeByActivity[entry.activity.activity]) {
				timeByActivity[entry.activity.activity] = 0;
			}
			timeByActivity[entry.activity.activity] += (entry.end.getTime() - entry.start.getTime())/1000;
		}

		for (var group of groups) {
			let entry = Collection.findById('work_log_entries', group.entries[0]);
			if (!timeByActivity[entry.activity.activity]) {
				timeByActivity[entry.activity.activity] = 0;
			}
			if (group.timeOverride) {
				timeByActivity[entry.activity.activity] += group.timeOverride;
			}
			else {
				for (let entryId of group.entries) {
					let entry = Collection.findById('work_log_entries', entryId);
					timeByActivity[entry.activity.activity] += (entry.end.getTime() - entry.start.getTime())/1000;	
				}
			}
		}

		return {
			totalTime: juration.stringify(Math.floor(totalTime)),
			timeByActivity: _.mapValues(timeByActivity, (value) => juration.stringify(Math.floor(value)))
		};
	}
	xRender() {
		return (
			<div className="work-log">
				{this.totalTime().totalTime}

				<ul>
					{_.map(this.totalTime().timeByActivity, (value, activity) => {
						return (
							<li key={activity}>{activity}: {value}</li>
						);
					})}
				</ul>
			</div>
		);
	}
}
