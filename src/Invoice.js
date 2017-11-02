import React from 'react';
import { XMap, XObject, XStrip, XComponent } from './XObject';
import { db, Models, Collection } from './db';
import { PropertyField, EntitySelector } from './UI';
import juration from 'juration';
import _ from 'lodash';

export class Invoice extends XComponent {

	_totalTime(entity) {
		var entries = this._workLogEntries(entity);
		var groups = {};

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
			totalTime: Math.floor(totalTime),
			timeByActivity: timeByActivity
		};
	}

	workLogEntries(entity) {
		var workLogEntries = this._workLogEntries(entity);
		var entities = Models.Entity.relatedEntities(entity, null, true);
		for (var entity of entities) {
			entities = entities.concat(this._workLogEntries(entity));
		}
		return entities;
	}

	_workLogEntries(entity) {
		return db.work_log_entries.filter((entry) => entry.invoice === this.props.invoice._id).filter((entry) => entry.activity.object.entity === entity._id);
	}

	totalTime(entity) {
		var totalTime = this._totalTime(entity);
		var entities = Models.Entity.relatedEntities(entity, null, true);

		var allEntities = [entity];
		
		for (var e of entities) {
			var t = this.totalTime(e);
			totalTime.totalTime += t.totalTime;
			allEntities = allEntities.concat(t.entities);

			for (var activity in t.timeByActivity) {
				if (!totalTime.timeByActivity[activity]) {
					totalTime.timeByActivity[activity] = t.timeByActivity[activity];
				}
				else {
					totalTime.timeByActivity[activity] += t.timeByActivity[activity];
				}
			}
		}

		totalTime.entities = allEntities;
		return totalTime;
	}

	formattedTotalTime(entity) {
		var totalTime = this.totalTime(entity);

		return {
			totalTime: juration.stringify(Math.floor(totalTime.totalTime)),
			timeByActivity: _.mapValues(totalTime.timeByActivity, (t) => juration.stringify(Math.floor(t))),
			entities: _.map(totalTime.entities, (entity) => Models.Entity.display(entity))
		};
	}

	renderTotalTime(entity) {
		return (
			<div>
				{Models.Entity.display(entity)}: {this.formattedTotalTime(entity).totalTime}
				<ul>
					{_.map(this.formattedTotalTime(entity).timeByActivity, (value, activity) => {
						return (
							<li key={activity}>{activity}: {value}</li>
						);
					})}
				</ul>

				<ul>
					{this.totalTime(entity).entities.filter(e => e != entity).map(e => {
						return (
							<li key={e._id}>
								{this.renderTotalTime(e)}
							</li>
						);
					})}
				</ul>

			</div>
		);
	}


	xRender() {
		return this.renderTotalTime(Collection.findById('entities', this.props.invoice.entity));
	}
}
