import React from 'react';
import { XMap, XObject,/* XStrip,*/ XComponent } from '../XObject';
import { db, Models, Collection } from '../db';
import { PropertyField, EntitySelector } from '../UI';
import { Link } from 'react-router-dom';

export class WorkProcess extends XComponent {
	constructor() {
		super({
			actions: {
				addLog() {
					if (!this.props.workProcess.log) {
						this.props.workProcess.log = XMap([]);
					}
					this.props.workProcess.log.push(XObject.obj({timestamp:new Date()}));
				},
				deleteLog(log) {
					this.props.workProcess.log.splice(this.props.workProcess.log.indexOf(log), 1);
				},
				addTask() {
					if (!this.props.workProcess.tasks) {
						this.props.workProcess.tasks = XMap([]);
					}
					this.props.workProcess.tasks.push(XObject.obj({timestamp:new Date()}));
				},
				deleteTask(task) {
					this.props.workProcess.tasks.splice(this.props.workProcess.tasks.indexOf(task), 1);
				},
			}
		})	
	}
	xRender() {
		return (
			<div>
				<PropertyField object={this.props.workProcess} property="focusEntity" type="entity" />
				<PropertyField object={this.props.workProcess} property="state" type="dropdown" options={['Created', 'Running', 'Paused', 'Waiting', 'Completed', 'Ended']} />

				<h2>Tasks</h2>
				<ul>
					{(this.props.workProcess.tasks || []).map((task) => {
						return (
							<li key={task._id}>
								<PropertyField object={task} property="completed" type="bool" />
								<PropertyField object={task} property="description" type="text/line" />
								<button onClick={this.actions.deleteTask.bind(task)}>Delete</button>
							</li>
						);
					})}
				</ul>
				<button onClick={this.actions.addTask}>Add</button>
				<h2>Log</h2>
				<ul>
					{(this.props.workProcess.log || []).map((log) => {
						return (
							<li key={log._id}>
								<PropertyField object={log} property="text" type="text/line" />
								<button onClick={this.actions.deleteLog.bind(log)}>Delete</button>
							</li>
						);
					})}
				</ul>
				<button onClick={this.actions.addLog}>Add</button>
			</div>
		);
	}
}