import React from 'react';
import { XMap, XObject, XStrip, XComponent } from './XObject';
import { db, Models, Collection } from './db';
import juration from './juration';
import jQuery from 'jquery';
import classNames from 'classnames';
import _ from 'lodash';
import { Link } from 'react-router-dom';

import { WorkTimeCalculator } from './WorkPeriod';

export class Time extends XComponent {
	constructor() {
		super({
			actions: {
				selectWorkTime(date) {
					if (this.state.selectedWorkTime && this.state.selectedWorkTime.getTime() == date.getTime()) {
						this.setState({
							selectedWorkTime: null
						});
					}
					else {
						this.setState({
							selectedWorkTime: date
						})						
					}
				}				
			}
		});

		this.state = {};
	}

	componentDidMount() {
		const updateCont = () => {
			let mainEl = jQuery('main');
			mainEl.outerHeight(jQuery(window).height() - mainEl.offset().top - 20);
		}
		jQuery(window).resize(updateCont);
		updateCont();
	}

	componentWillUnmount() {
		super.componentWillUnmount();
		jQuery('main').height('');
	}


	time(start, end, schedule) {
		let current = start.clone()./*addDays(1).*/beginningOfDay();
		let time = 0;
		while (true) {
			time += schedule(current)*60*60;
			current.addDays(1);

			if (current.getTime() > end.getTime()) return time;
		}
	}

	countDays(start, end, test) {
		let current = start.clone()./*addDays(1).*/beginningOfDay();
		let total = 0;
		while (true) {
			if (test(current)) total ++;
			current.addDays(1);
			if (current.getTime() > end.getTime()) return total;
		}
	}

	dates() {
		let entries = [];
		for (let entity of db.entities) {
			if (entity.milestones) {
				let milestone = entity.milestones.find((milestone) => !milestone.completed);
				if (milestone) {
					entries.push({
						date: milestone.deadline,
						milestone: milestone,
						entity: entity
					});					
				}
			}

			if (entity.workBlocks) {
				let workBlocks = entity.workBlocks.filter((workBlock) => !workBlock.completed);
				for (let workBlock of workBlocks) {
					entries.push({
						date: workBlock.end,
						workBlock: workBlock,
						entity: entity
					});
				}
			}
		}

		let entriesByDate = {};

		for (let entry of entries) {
			let date = entry.date.beginningOfDay();
			if (!entriesByDate[date.getTime()]) {
				entriesByDate[date.getTime()] = [];
			}
			entriesByDate[date.getTime()].push(entry);
		}
		
		let tmp = [];
		for (let date in entriesByDate) {
			tmp.push({
				date: new Date(parseInt(date)),
				entries: entriesByDate[date]
			});
		}

		tmp.sort((a, b) => {
			return b.date.getTime() - a.date.getTime();
		});

		entriesByDate = tmp;

		let dates = [];
		for (let i = 0; i < entriesByDate.length; ++ i) {
			let entryI = entriesByDate[i];
			let date = {
				date: entryI.date,
				entries: [],
			};
			dates.push(date);
			for (let j = i; j < entriesByDate.length; ++ j) {
				let entryJ = entriesByDate[j];
				date.entries = date.entries.concat(entryJ.entries);
			}
		}
		dates.sort((a, b) => a.date.getTime() - b.date.getTime());

		return dates;
	}

	dayBreakdown({date, currentTime, schedules, dayTotals}) {
		let totalWorkTime = 0;
		for (let entry of date.entries) {
			if (entry.milestone) {
				totalWorkTime += entry.milestone.time;							
			}
			else if (entry.workBlock) {
				totalWorkTime += Math.max(0, entry.workBlock.time - entry.workedTime);
			}
		}

		let times = [];
		for (let schedule in schedules) {
			let time = this.time(currentTime, date.date, schedules[schedule]);
			times.push({
				name: schedule,
				time: time,
			});
		}

		let a = [];
		for (let daysCounter of dayTotals) {
			let totalDays = this.countDays(currentTime, date.date, daysCounter.test);
			times.push({
				name: `${juration.stringify(Math.ceil(totalWorkTime/totalDays / 60)*60)}/${daysCounter.name}`,
				time: totalWorkTime
			})
		}
		times.sort((a, b) => b.time - a.time);

		let maxTime = times[0].time;

		let clusteredTimes = {};
		for (let time of times) {
			let key = Math.floor(Math.round(time.time/maxTime*100)/2);
			if (!clusteredTimes[key]) {
				clusteredTimes[key] = {times:[], value:Math.round(time.time/maxTime*100), time: time.time};
			}
			clusteredTimes[key].times.push(time);
		}

		return {clusteredTimes, totalWorkTime, maxTime};
	}

	xRender() {
		let timeByDay = (() => {
			let trailingDays = new Date().beginningOfDay().addDays(-20);
			let timeByDay = {};
			let currentDay = trailingDays.clone();
			while (true) {
				let dayBegin = currentDay;
				let dayEnd = currentDay.clone().endOfDay();
				let totalTime = Math.round(db.work_log_entries.filter((entry) => {
					return (entry.end || new Date()).isBetween(dayBegin, dayEnd);
				}).reduce((total, entry) => {
					return total + (entry.end || new Date()).getTime() - entry.start.getTime();
				}, 0)/1000);

				timeByDay[dayBegin.getTime()] = totalTime

				currentDay.addDays(1);
				if (currentDay.isAfter(new Date())) break;
			}

			return timeByDay;
		})();

		const addWorkedTimeToDates = (dates) => {
			for (let date of dates) {
				for (let entry of date.entries) {
					if (entry.workBlock) {
						let calc = new WorkTimeCalculator(entry.workBlock.start, entry.workBlock.end, []);
						entry.workedTime = calc.totalTime(entry.entity).totalTime;
					}
				}
			}
			return dates;
		}

		let dates = addWorkedTimeToDates(this.dates());

		const dayTotals = [
			{
				name: 'Day',
				test(date) {
					return true;
				}
			},
			{
				name: 'Workday',
				test(date) {
					return !(date.getDay() == 0 || date.getDay() == 6);
				}
			},
		];

		const schedules = {
			['24 hrs/Day'](date) {
				return 24;
			},
			['24 hrs/Workday'](date) {
				if (date.getDay() == 0 || date.getDay() == 6) return 0;
				return 24;
			},
			['14 hrs/Day'](date) {
				return 14;
			},
			['14 hrs/Workday'](date) {
				if (date.getDay() == 0 || date.getDay() == 6) return 0;
				return 14;
			},
			['6 hrs/Workday'](date) {
				if (date.getDay() == 0 || date.getDay() == 6) return 0;
				return 6;
			},
			['7 hrs/Workday'](date) {
				if (date.getDay() == 0 || date.getDay() == 6) return 0;
				return 7;
			},
			['7 hrs/Day'](date) {
				return 7;
			},
			['6 hrs/Day'](date) {
				return 6;
			},
		};

		const currentTime = new Date();

		return (
			<div className="time-view">
				{this.state.selectedWorkTime && <div className="entities">
					{dates.find((date) => date.date.getTime() == this.state.selectedWorkTime.getTime()).entries.map((entry) => {
						return (
							<div key={entry.milestone ? entry.milestone._id : entry.workBlock._id}>
								<Link to={`/entities/${entry.entity._id}`}>
								{Models.Entity.display(entry.entity)}
								{entry.milestone && <span>
									{juration.stringify(entry.milestone.time)}
									{entry.milestone.deadline.format('{Mon} {d}')}
								</span>}
								{entry.workBlock && <span>
									{juration.stringify(entry.workBlock.time - entry.workedTime)}
									{entry.workBlock.end.format('{Mon} {d}')}
								</span>}
								</Link>
							</div>
						);
					})}
				</div>}
				<div className="dates">
					{dates.map((date) => {
						const {clusteredTimes, totalWorkTime, maxTime} = this.dayBreakdown({date, currentTime, schedules, dayTotals});
						const totalWorkTimeHeight = Math.round((totalWorkTime/maxTime)*100) + '%';
						const isSelected = this.state.selectedWorkTime && date.date.getTime() == this.state.selectedWorkTime.getTime();
						
						return (
							<div className="date" key={date.date.getTime()}>
								<div className="date__date">{date.date.format('{Mon} {d}')}</div>
								<div className="date__times">
									<div onClick={this.actions.selectWorkTime.bind(date.date)} className={classNames('work-time', {selected:isSelected})} style={{height:totalWorkTimeHeight}} />
									{_.map(clusteredTimes, (entry, key) => {
										return (
											key > 0 ? <div className="time" style={{height:entry.value + '%'}} key={key}>
												<span className="labels">{entry.times.map((time) => time.name).join('; ')}</span>
												{/*<span>{juration.stringify(entry.time)}</span>*/}
											</div> : null
										);
									}).reverse()}
								</div>
							</div>
						);
					})}
				</div>
				<div className="days">
					{_.map(timeByDay, (time, date) => {
						return (
							<div className="day" key={date}>
								<span className="date">{new Date(parseInt(date)).format('{Dow}, {Mon} {d}')}</span>
								<span className="time">{juration.stringify(Math.round(time/60)*60)}</span>
							</div>
						);
					})}
				</div>
			</div>
		);
	}
}