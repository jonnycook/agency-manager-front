import React, { Component } from 'react';
import { XComponent, XObject, XMap, XStrip } from './XObject';
import juration from './juration';
import { EntitySelector } from './EntitySelector';
function withRef(ref, component) {
  return new Proxy({}, {
    get(target, prop) { return prop == 'ref' ? ref : component[prop] }
  });
}
export class EditableValue extends XComponent {
  constructor() {
    super();
    this.state = { editing: false };
  }
  action_save() {
    this.props.set(this.extractValue());
    this.setState({ editing: false });
  }
  action_cancel() {
    this.setState({ editing: false });
  }
  action_edit() {
    this.setState({ editing: true });
  }

  extractValue() {
    if (this.props.input) {
      return this.refs.input.selectedValue();
    }
    else {
      switch (this.props.type || 'text') {
        default:
          return this.refs.input.value;
        case 'date': 
          try {
            return Date.create(this.refs.input.value);          
          }
          catch (e) {
            return null;
          }
        case 'datetime': 
          try {
            return Date.create(this.refs.input.value);
          }
          catch (e) {
            return null;
          }
        case 'bool':
          return this.refs.input.checked;

        case 'duration':
          return juration.parse(this.refs.input.value);
      }
    }
  }

  input() {
    if (this.props.input) {
      return withRef('input', this.props.input(this.props.get(), (value) => {
        this.props.set(value);
        this.setState({ editing: false });
      }));
    }
    else {
      switch (this.props.type || 'text') {
        default:
        case 'text':
          return <input type="text" ref="input" onKeyPress={(e) => e.key === 'Enter' && this.action_save()} defaultValue={this.props.get()} />;

        case 'duration':
          return <input type="text" ref="input" onKeyPress={(e) => e.key === 'Enter' && this.action_save()} defaultValue={this.props.get() ? juration.stringify(this.props.get()) : ''} />;

        case 'date':
          return <input type="date" ref="input" onKeyPress={(e) => e.key === 'Enter' && this.action_save()} defaultValue={this.props.get() && this.props.get().format('{yyyy}-{MM}-{dd}')} />;
        case 'datetime':
          return <input type="datetime" ref="input" onKeyPress={(e) => e.key === 'Enter' && this.action_save()} defaultValue={this.props.get() && this.props.get().format('{yyyy}-{MM}-{dd} {HH}:{mm}:{ss}')} />;

        case 'bool':
          return <input ref="input" defaultChecked={this.props.get()} type="checkbox" />
      }
    }
  }

  display() {
    if (this.props.display) {
      return this.props.display(this.props.get());
    }
    else {
      switch (this.props.type || 'text') {
        default:
          return this.props.get()
        case 'text':
          return this.props.get() && this.props.get().toString();
        case 'date':
          return this.props.get() && this.props.get().format('{yyyy}-{MM}-{dd}');
        case 'datetime':
          return this.props.get() && this.props.get().format('{yyyy}-{MM}-{dd} {HH}:{mm}:{ss}');
        case 'bool':
          return this.props.get() ? 'Yes' : 'No';

        case 'duration':
          return this.props.get() && juration.stringify(this.props.get());
      }
    }
  }
  xRender() {
    if (this.props.type == 'entity') {
      return <EntitySelector entity={() => this.props.get()} set={this.props.set} />
    }
    return (
      this.state.editing ?
        <span className={this.props.className}>
          {this.input()}
          <button onClick={this.action_save.bind(this)}>Save</button>
          <button onClick={this.action_cancel.bind(this)}>Cancel</button>
        </span> :
        <span className={this.props.className}>
          {this.display()}
          <button onClick={this.action_edit.bind(this)}>Edit</button>
        </span>
    );
  }
}
