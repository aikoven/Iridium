﻿/// <reference path="../_references.d.ts" />
import Iridium = require('./Core');
import ISchema = require('./Schema');
import MongoDB = require('mongodb');
import Model = require('./Model');
import ModelCache = require('./ModelCache');
import ModelOptions = require('./ModelOptions');
import _ = require('lodash');
import Bluebird = require('bluebird');

export = ModelHandlers;

class ModelHandlers<TDocument extends { _id?: any }, TInstance> {
    constructor(public model: Model<TDocument, TInstance>) {

    }

    documentReceived<TResult>(conditions: any,
        result: TDocument,
        wrapper: (document: TDocument, isNew?: boolean, isPartial?: boolean) => TResult,
        options: ModelOptions.QueryOptions = {}): Bluebird<TResult> {
        _.defaults(options, {
            cache: true,
            partial: false
        });

        return Bluebird.resolve(result).then((target: any) => {
            return <Bluebird<TResult>>Bluebird.resolve().then(() => {
                // Trigger the received hook
                if (this.model.options.hooks.retrieved) return this.model.options.hooks.retrieved(target);
            }).then(() => {
                // Cache the document if caching is enabled
                if (this.model.core.cache && options.cache && !options.fields) {
                    var cacheDoc = _.cloneDeep(target);
                    return this.model.cache.set(cacheDoc);
                }
            }).then(() => {
                // Wrap the document and trigger the ready hook
                var wrapped: TResult = wrapper(target, false, !!options.fields);

                if (this.model.options.hooks.ready && wrapped instanceof this.model.Instance) return Bluebird.resolve(this.model.options.hooks.ready(<TInstance><any>wrapped)).then(() => wrapped);
                return wrapped;
            });
        });
    }

    creatingDocuments(documents: TDocument[]): Bluebird<any[]> {
        return Bluebird.all(documents.map((document: any) => {
            return Bluebird.resolve().then(() => {
                if (this.model.options.hooks.retrieved) return this.model.options.hooks.creating(document);
            }).then(() => {
                var validation: SkmatcCore.IResult = this.model.helpers.validate(document);
                if (validation.failed) return Bluebird.reject(validation.error);
                return document;
            });
        }));
    }

    savingDocument(instance: TInstance, changes: any): Bluebird<TInstance> {
        return Bluebird.resolve().then(() => {
            if (this.model.options.hooks.saving) return this.model.options.hooks.saving(instance, changes);
        }).then(() => instance);
    }
}
