import React from 'react';
import { XMap, XObject, XStrip, XComponent } from './XObject';
import { db, Models, Collection } from './db';
import { PropertyField, EntitySelector } from './UI';
import juration from './juration';
import _ from 'lodash';

export class WorkPeriodHelper {
	constructor(workPeriod) {
		this.workPeriod = workPeriod;
	}

	_totalTime(entity) {
		if ((this.workPeriod.entityExclusions || []).find((entityExclusion) => entityExclusion._value == entity._id)) {
			return {
				totalTime: 0,
				timeByActivity: {}
			}
		}

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
			totalTime += ((entry.end || new Date()).getTime() - entry.start.getTime())/1000;
		}

		for (var group of groups) {
			if (group.timeOverride) {
				totalTime += group.timeOverride;
			}
			else {
				for (var entryId of group.entries) {
					let entry = Collection.findById('work_log_entries', entryId);
					totalTime += ((entry.end || new Date()).getTime() - entry.start.getTime())/1000;
				}
			}
		}

		var timeByActivity = {};

		for (var entry of entries) {
			if (!timeByActivity[entry.activity.activity]) {
				timeByActivity[entry.activity.activity] = 0;
			}
			timeByActivity[entry.activity.activity] += ((entry.end || new Date()).getTime() - entry.start.getTime())/1000;
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
					timeByActivity[entry.activity.activity] += ((entry.end || new Date()).getTime() - entry.start.getTime())/1000;	
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
		for (var e of entities) {
			workLogEntries = workLogEntries.concat(this._workLogEntries(e));
		}
		return workLogEntries;
	}

	_workLogEntries(entity) {
		var allEntries =  db.work_log_entries.filter((entry) => this.workPeriod.startDate && (entry.start.getTime() >= this.workPeriod.startDate.getTime() && (!this.workPeriod.endDate || entry.start.getTime() <= this.workPeriod.endDate.getTime())));


		var entries = allEntries.filter((entry) => entry.activity.object.entity === entity._id);
		
		var tasks = db.tasks.filter((task) => task.entity === entity._id);
		for (var task of tasks) {
			entries = entries.concat(allEntries.filter((entry) => entry.activity.object.task === task._id));
		}

		var issues = db.issues.filter((issue) => issue.entity === entity._id);
		for (var issue of issues) {
			entries = entries.concat(allEntries.filter((entry) => entry.activity.object.issue === issue._id));
		}

		return entries;
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

		totalTime.entities = entities;
		return totalTime;
	}

	formattedTotalTime(entity) {
		return this.formatTotalTime(this.totalTime(entity));
	}

	formatTotalTime(totalTime) {
		return {
			totalTime: juration.stringify(Math.floor(totalTime.totalTime)),
			timeByActivity: _.mapValues(totalTime.timeByActivity, (t) => juration.stringify(Math.floor(t))),
			entities: _.map(totalTime.entities, (entity) => Models.Entity.display(entity))
		};
	}

	renderTotalTime(entity) {
		var totalTime = this.totalTime(entity);
		var formattedTotalTime = this.formatTotalTime(totalTime);
		return totalTime.totalTime ? (
			<div>
				<b>{Models.Entity.display(entity)}: {formattedTotalTime.totalTime}</b>
				<ul>
					{_.map(formattedTotalTime.timeByActivity, (value, activity) => {
						return (
							<li key={activity}><i>{activity}: {value}</i></li>
						);
					})}
				</ul>
				<ul>
					{totalTime.entities.filter(e => e != entity).map(e => {
						var el = this.renderTotalTime(e);
						return el ? (
							<li key={e._id}>
								{el}
							</li>
						) : null
					})}
				</ul>
			</div> 
		) : null;
	}
}

export class WorkPeriod extends XComponent {
	constructor() {
		super({
			actions: {
				addEntityExclusion() {
					if (!this.props.workPeriod.entityExclusions) {
						this.props.workPeriod.entityExclusions = XMap([]);
					}
					this.props.workPeriod.entityExclusions.push(XObject.obj());
				},
				removeEntityExclusion(entityExclusion) {
					this.props.workPeriod.entityExclusions.splice(this.props.workPeriod.entityExclusions.indexOf(entityExclusion), 1);
				}
			}
		});
	}

	xRender() {
		var helper = new WorkPeriodHelper(this.props.workPeriod);
		return (
			<div>
				<div>
					<label>Start Date:</label>
					<PropertyField object={this.props.workPeriod} property="startDate" type="datetime" />
				</div>
				<div>
					<label>End Date:</label>
					<PropertyField object={this.props.workPeriod} property="endDate" type="datetime" />
				</div>
				<div>
					<label>Time Allocation:</label>
					<PropertyField object={this.props.workPeriod} property="timeAllocation" type="duration" />
				</div>
				<div>
					<label>Finished:</label>
					<PropertyField object={this.props.workPeriod} property="finished" type="bool" />
				</div>
				<div>
					<label>Base Entity:</label>
					<PropertyField object={this.props.workPeriod} property="baseEntity" type="entity" />
				</div>

				<ul>
					{(this.props.workPeriod.entityExclusions || []).map((entityExclusion) => {
						return (
							<li key={entityExclusion._id}>
								<PropertyField object={entityExclusion} property="_value" type="entity" />
								<button onClick={this.actions.removeEntityExclusion.bind(entityExclusion)}>Remove</button>
							</li>
						);
					})}
				</ul>
				<button onClick={this.actions.addEntityExclusion}>Exclude Entity</button>

				{this.props.workPeriod.baseEntity && helper.renderTotalTime(Collection.findById('entities', this.props.workPeriod.baseEntity))}
			</div>
		);
	}
}