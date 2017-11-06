import React from 'react';
import { XMap, XObject,/* XStrip,*/ XComponent } from './XObject';
import { db, Models, Collection } from './db';
import { PropertyField, EntitySelector } from './UI';
import juration from './juration';
import _ from 'lodash';

export class Schedule extends XComponent {
	constructor() {
		super({
			actions: {
				addBlock() {
					if (!this.schedule.blocks) this.schedule.blocks = [];
					this.schedule.blocks.push(XObject.obj());
				},
				deleteBlock(block) {
					this.schedule.blocks.splice(this.schedule.blocks.indexOf(block), 1);
				}
			}
		});

		this.schedule = db.schedules[0];
		if (!this.schedule) {
			this.schedule = XObject.obj();
			db.schedules.push(this.schedule);
		}
	}

	dateFramework(date) {
		// return [
		// 	[9, 12],
		// 	[13, 17]
		// ];

		if (date.getDay() != 0 && date.getDay() != 6) {
			return [
				[9, 12],
				[13, 17]
			];
		}
		else {
			return [];
		}
	}

	scheduledBlocks() {
		const Blocks = (() => {
			var date = this.schedule.start.clone();

			const next = (inc) => {
				if (inc) date.addDays(1);
				while (true) {
					framework = this.dateFramework(date);
					if (framework.length) {
						return framework;
					}
					date.addDays(1);
				}
			}

			var framework = next();


			var i = 0;
			var workTimeBlock = framework[i++];

			workTimeBlock[0] = new Date(date.getFullYear(), date.getMonth(), date.getDate(), workTimeBlock[0], 0, 0);
			workTimeBlock[1] = new Date(date.getFullYear(), date.getMonth(), date.getDate(), workTimeBlock[1], 0, 0);
			if (workTimeBlock[0].getTime() < this.schedule.start.getTime()) {
				workTimeBlock[0] = this.schedule.start;
			}

			var start = workTimeBlock[0];

			return {
				take: (time) => {
					console.log(time);
					var blocks = [];

					while (time > 0) {
						console.log(workTimeBlock);
						var used = Math.min(time*1000, workTimeBlock[1].getTime() - start.getTime());
						console.log(used);
						time -= used/1000;
						var end = new Date(start.getTime() + used);

						console.log(start, end);

						blocks.push([start, end]);

						if (end.getTime() == workTimeBlock[1].getTime()) {
							workTimeBlock = framework[i++];
							if (!workTimeBlock) {
								framework = next(true);
								i = 0;

								workTimeBlock = framework[i++];
							}

							console.log(workTimeBlock);
							workTimeBlock[0] = new Date(date.getFullYear(), date.getMonth(), date.getDate(), workTimeBlock[0], 0, 0);
							workTimeBlock[1] = new Date(date.getFullYear(), date.getMonth(), date.getDate(), workTimeBlock[1], 0, 0);

							start = workTimeBlock[0];

						}
						else {
							start = end;
						}
					}

					return blocks;
				},
				startOfBlock: () => {
					return workTimeBlock[0] && start.getTime() == workTimeBlock[0].getTime();
				}
			};
		})();

		var scheduledBlocks = [];

		for (var block of this.schedule.blocks) {
			var workTimeBlocks = Blocks.take(block.time);
			for (var workTimeBlock of workTimeBlocks) {
				scheduledBlocks.push({
					start: workTimeBlock[0],
					end: workTimeBlock[1],
					entity: block.entity
				});
			}
			if (!Blocks.startOfBlock()) {
				Blocks.take(60*10);
			}
		}

		return scheduledBlocks;
	}

	scheduledBlocksByDate() {
		var scheduledBlocks = this.scheduledBlocks();
		var scheduledBlocksByDate = {};
		for (var block of scheduledBlocks) {
			var key = block.start.format('{yyyy}-{MM}-{dd}');
			if (!scheduledBlocksByDate[key]) {
				scheduledBlocksByDate[key] = [];
			}
			scheduledBlocksByDate[key].push(block);
		}
		return _.map(scheduledBlocksByDate, (blocks, date) => ({ date: date, blocks: blocks }));
	}

	totalTime() {
		var totalTime = {};
		for (var block of this.schedule.blocks) {
			if (block.entity) {
				if (!totalTime[block.entity]) {
					totalTime[block.entity] = 0;
				}
				totalTime[block.entity] += block.time;
			}
		}
		return _.map(totalTime, (time, entity) => {
			return {
				entity: Collection.findById('entities', entity),
				time: juration.stringify(time || 0)
			};
		})
	}

	xRender() {
		return (
			<div>
				<PropertyField type="datetime" object={this.schedule} property="start" />
				<ul>
					{(this.schedule.blocks || []).map((block) => {
						return (
							<li key={block._id}>
								<PropertyField type="entity" object={block} property="entity" />
								<PropertyField type="duration" object={block} property="time" />
								<button onClick={this.actions.deleteBlock.bind(block)}>Delete</button>
							</li>
						);
					})}
				</ul>
				<button onClick={this.actions.addBlock}>Add</button>
				<ul>
					{this.totalTime().map((entry) => {
						return <li key={entry.entity._id}>
							{Models.Entity.display(entry.entity, false)}: {entry.time}
						</li>
					})}
				</ul>
				<ul>
					{this.scheduledBlocksByDate().map((date) => {
						return (
							<li key={date.date}>
								{date.date} ({Date.create(date.date).format('{Dow}')})
								<ul>
									{date.blocks.map((block, i) => {
										return (
											<li key={i}>
												<div>{Models.Entity.display(Collection.findById('entities', block.entity), false)}</div>
												<div>{block.start.format('{HH}:{mm}')} - {block.end.format('{HH}:{mm}')} ({juration.stringify((block.end.getTime() - block.start.getTime())/1000)})</div>
											</li>
										);
									})}
								</ul>
							</li>
						);
					})}
				</ul>
			</div>
		);
	}
}