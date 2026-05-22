declare namespace _default {
    let $schema: string;
    let $comment: string;
    namespace definitions {
        namespace YahooFinanceOptions {
            export let type: string;
            export namespace properties {
                namespace YF_QUERY_HOST {
                    let type_1: string;
                    export { type_1 as type };
                }
                namespace queue {
                    let $ref: string;
                }
                namespace validation {
                    let $ref_1: string;
                    export { $ref_1 as $ref };
                }
                namespace suppressNotices {
                    let type_2: string;
                    export { type_2 as type };
                    export namespace items {
                        let $ref_2: string;
                        export { $ref_2 as $ref };
                    }
                }
                namespace quoteCombine {
                    let $ref_3: string;
                    export { $ref_3 as $ref };
                }
                namespace versionCheck {
                    let type_3: string;
                    export { type_3 as type };
                }
                namespace cookieJar {
                    let $ref_4: string;
                    export { $ref_4 as $ref };
                }
                namespace logger {
                    let $ref_5: string;
                    export { $ref_5 as $ref };
                }
                let fetch: {};
                namespace fetchOptions {
                    let type_4: string;
                    export { type_4 as type };
                    export namespace properties_1 {
                        namespace body {
                            let anyOf: ({
                                type: string;
                                properties: {
                                    locked: {
                                        type: string;
                                    };
                                    size?: undefined;
                                    type?: undefined;
                                    buffer?: undefined;
                                    byteLength?: undefined;
                                    byteOffset?: undefined;
                                };
                                required: string[];
                                additionalProperties: boolean;
                            } | {
                                type: string;
                                properties: {
                                    size: {
                                        type: string;
                                    };
                                    type: {
                                        type: string;
                                    };
                                    locked?: undefined;
                                    buffer?: undefined;
                                    byteLength?: undefined;
                                    byteOffset?: undefined;
                                };
                                required: string[];
                                additionalProperties: boolean;
                            } | {
                                type: string;
                                properties: {
                                    buffer: {
                                        type: string;
                                        properties: {
                                            byteLength: {
                                                type: string;
                                            };
                                        };
                                        required: string[];
                                        additionalProperties: boolean;
                                    };
                                    byteLength: {
                                        type: string;
                                    };
                                    byteOffset: {
                                        type: string;
                                    };
                                    locked?: undefined;
                                    size?: undefined;
                                    type?: undefined;
                                };
                                required: string[];
                                additionalProperties: boolean;
                            } | {
                                type: string;
                                properties: {
                                    byteLength: {
                                        type: string;
                                    };
                                    locked?: undefined;
                                    size?: undefined;
                                    type?: undefined;
                                    buffer?: undefined;
                                    byteOffset?: undefined;
                                };
                                required: string[];
                                additionalProperties: boolean;
                            } | {
                                type: string;
                                additionalProperties: boolean;
                                properties?: undefined;
                                required?: undefined;
                            } | {
                                type: string;
                                properties: {
                                    size: {
                                        type: string;
                                    };
                                    locked?: undefined;
                                    type?: undefined;
                                    buffer?: undefined;
                                    byteLength?: undefined;
                                    byteOffset?: undefined;
                                };
                                required: string[];
                                additionalProperties: boolean;
                            } | {
                                type: string;
                                properties?: undefined;
                                required?: undefined;
                                additionalProperties?: undefined;
                            })[];
                        }
                        namespace cache {
                            let type_5: string;
                            export { type_5 as type };
                            let _enum: string[];
                            export { _enum as enum };
                        }
                        namespace credentials {
                            let type_6: string;
                            export { type_6 as type };
                            let _enum_1: string[];
                            export { _enum_1 as enum };
                        }
                        namespace headers {
                            let anyOf_1: ({
                                type: string;
                                items: {
                                    type: string;
                                    items: {
                                        type: string;
                                    };
                                    minItems: number;
                                    maxItems: number;
                                };
                                additionalProperties?: undefined;
                            } | {
                                type: string;
                                additionalProperties: {
                                    type: string;
                                };
                                items?: undefined;
                            } | {
                                type: string;
                                additionalProperties: boolean;
                                items?: undefined;
                            })[];
                            export { anyOf_1 as anyOf };
                        }
                        namespace integrity {
                            let type_7: string;
                            export { type_7 as type };
                        }
                        namespace keepalive {
                            let type_8: string;
                            export { type_8 as type };
                        }
                        namespace method {
                            let type_9: string;
                            export { type_9 as type };
                        }
                        namespace mode {
                            let type_10: string;
                            export { type_10 as type };
                            let _enum_2: string[];
                            export { _enum_2 as enum };
                        }
                        namespace priority {
                            let type_11: string;
                            export { type_11 as type };
                            let _enum_3: string[];
                            export { _enum_3 as enum };
                        }
                        namespace redirect {
                            let type_12: string;
                            export { type_12 as type };
                            let _enum_4: string[];
                            export { _enum_4 as enum };
                        }
                        namespace referrer {
                            let type_13: string;
                            export { type_13 as type };
                        }
                        namespace referrerPolicy {
                            let type_14: string;
                            export { type_14 as type };
                            let _enum_5: string[];
                            export { _enum_5 as enum };
                        }
                        namespace signal {
                            let anyOf_2: ({
                                type: string;
                                properties: {
                                    aborted: {
                                        type: string;
                                    };
                                    onabort: {
                                        anyOf: ({
                                            type?: undefined;
                                        } | {
                                            type: string;
                                        })[];
                                    };
                                    reason: {};
                                };
                                required: string[];
                                additionalProperties: boolean;
                            } | {
                                type: string;
                                properties?: undefined;
                                required?: undefined;
                                additionalProperties?: undefined;
                            })[];
                            export { anyOf_2 as anyOf };
                        }
                        namespace window {
                            let type_15: string;
                            export { type_15 as type };
                        }
                    }
                    export { properties_1 as properties };
                    export let additionalProperties: boolean;
                }
            }
            let additionalProperties_1: boolean;
            export { additionalProperties_1 as additionalProperties };
        }
        namespace QueueOptions {
            let type_16: string;
            export { type_16 as type };
            export namespace properties_2 {
                namespace _queue {
                    let $ref_6: string;
                    export { $ref_6 as $ref };
                }
                namespace concurrency {
                    let type_17: string;
                    export { type_17 as type };
                }
            }
            export { properties_2 as properties };
            let additionalProperties_2: boolean;
            export { additionalProperties_2 as additionalProperties };
        }
        namespace Queue {
            let type_18: string;
            export { type_18 as type };
            export namespace properties_3 {
                export namespace concurrency_1 {
                    let type_19: string;
                    export { type_19 as type };
                }
                export { concurrency_1 as concurrency };
                export namespace _running {
                    let type_20: string;
                    export { type_20 as type };
                }
                export namespace _queue_1 {
                    let type_21: string;
                    export { type_21 as type };
                    export namespace items_1 {
                        let type_22: string;
                        export { type_22 as type };
                        export namespace properties_4 {
                            let func: {};
                            let resolve: {};
                            let reject: {};
                        }
                        export { properties_4 as properties };
                        export let required: string[];
                        let additionalProperties_3: boolean;
                        export { additionalProperties_3 as additionalProperties };
                    }
                    export { items_1 as items };
                }
                export { _queue_1 as _queue };
            }
            export { properties_3 as properties };
            let required_1: string[];
            export { required_1 as required };
            let additionalProperties_4: boolean;
            export { additionalProperties_4 as additionalProperties };
        }
        namespace ValidationOptions {
            let type_23: string;
            export { type_23 as type };
            export namespace properties_5 {
                namespace logErrors {
                    let type_24: string;
                    export { type_24 as type };
                }
                namespace logOptionsErrors {
                    let type_25: string;
                    export { type_25 as type };
                }
                namespace allowAdditionalProps {
                    let type_26: string;
                    export { type_26 as type };
                }
            }
            export { properties_5 as properties };
            let additionalProperties_5: boolean;
            export { additionalProperties_5 as additionalProperties };
        }
        namespace NOTICE_IDS {
            let type_27: string;
            export { type_27 as type };
            let _enum_6: string[];
            export { _enum_6 as enum };
        }
        namespace QuoteCombineOptions {
            let type_28: string;
            export { type_28 as type };
            export namespace properties_6 {
                namespace maxSymbolsPerRequest {
                    let type_29: string;
                    export { type_29 as type };
                }
                namespace debounceTime {
                    let type_30: string;
                    export { type_30 as type };
                }
            }
            export { properties_6 as properties };
            let additionalProperties_6: boolean;
            export { additionalProperties_6 as additionalProperties };
        }
        namespace ExtendedCookieJar {
            let type_31: string;
            export { type_31 as type };
            let additionalProperties_7: boolean;
            export { additionalProperties_7 as additionalProperties };
            export namespace properties_7 {
                namespace store {
                    let $ref_7: string;
                    export { $ref_7 as $ref };
                }
                namespace prefixSecurity {
                    let type_32: string;
                    export { type_32 as type };
                }
            }
            export { properties_7 as properties };
            let required_2: string[];
            export { required_2 as required };
        }
        namespace CookieJar {
            let type_33: string;
            export { type_33 as type };
            export namespace properties_8 {
                export namespace store_1 {
                    let $ref_8: string;
                    export { $ref_8 as $ref };
                }
                export { store_1 as store };
                export namespace prefixSecurity_1 {
                    let type_34: string;
                    export { type_34 as type };
                }
                export { prefixSecurity_1 as prefixSecurity };
            }
            export { properties_8 as properties };
            let required_3: string[];
            export { required_3 as required };
            let additionalProperties_8: boolean;
            export { additionalProperties_8 as additionalProperties };
        }
        namespace Store {
            let type_35: string;
            export { type_35 as type };
            export namespace properties_9 {
                namespace synchronous {
                    let type_36: string;
                    export { type_36 as type };
                }
            }
            export { properties_9 as properties };
            let required_4: string[];
            export { required_4 as required };
            let additionalProperties_9: boolean;
            export { additionalProperties_9 as additionalProperties };
        }
        namespace Logger {
            let type_37: string;
            export { type_37 as type };
            export namespace properties_10 {
                let info: {};
                let warn: {};
                let error: {};
                let debug: {};
                let dir: {};
            }
            export { properties_10 as properties };
            let required_5: string[];
            export { required_5 as required };
            let additionalProperties_10: boolean;
            export { additionalProperties_10 as additionalProperties };
        }
        let mergeObjects: {};
        let validateOptions: {};
        let setOptions: {};
        namespace YahooFinanceFetchModuleOptions {
            let type_38: string;
            export { type_38 as type };
            export namespace properties_11 {
                export namespace devel {
                    let type_39: string;
                    export { type_39 as type };
                    export namespace properties_12 {
                        namespace id {
                            let type_40: string;
                            export { type_40 as type };
                        }
                        let t: {};
                        let onFinish: {};
                    }
                    export { properties_12 as properties };
                    let required_6: string[];
                    export { required_6 as required };
                    let additionalProperties_11: boolean;
                    export { additionalProperties_11 as additionalProperties };
                }
                let fetch_1: {};
                export { fetch_1 as fetch };
                export namespace fetchOptions_1 {
                    let type_41: string;
                    export { type_41 as type };
                    export namespace properties_13 {
                        export namespace body_1 {
                            let anyOf_3: ({
                                type: string;
                                properties: {
                                    locked: {
                                        type: string;
                                    };
                                    size?: undefined;
                                    type?: undefined;
                                    buffer?: undefined;
                                    byteLength?: undefined;
                                    byteOffset?: undefined;
                                };
                                required: string[];
                                additionalProperties: boolean;
                            } | {
                                type: string;
                                properties: {
                                    size: {
                                        type: string;
                                    };
                                    type: {
                                        type: string;
                                    };
                                    locked?: undefined;
                                    buffer?: undefined;
                                    byteLength?: undefined;
                                    byteOffset?: undefined;
                                };
                                required: string[];
                                additionalProperties: boolean;
                            } | {
                                type: string;
                                properties: {
                                    buffer: {
                                        type: string;
                                        properties: {
                                            byteLength: {
                                                type: string;
                                            };
                                        };
                                        required: string[];
                                        additionalProperties: boolean;
                                    };
                                    byteLength: {
                                        type: string;
                                    };
                                    byteOffset: {
                                        type: string;
                                    };
                                    locked?: undefined;
                                    size?: undefined;
                                    type?: undefined;
                                };
                                required: string[];
                                additionalProperties: boolean;
                            } | {
                                type: string;
                                properties: {
                                    byteLength: {
                                        type: string;
                                    };
                                    locked?: undefined;
                                    size?: undefined;
                                    type?: undefined;
                                    buffer?: undefined;
                                    byteOffset?: undefined;
                                };
                                required: string[];
                                additionalProperties: boolean;
                            } | {
                                type: string;
                                additionalProperties: boolean;
                                properties?: undefined;
                                required?: undefined;
                            } | {
                                type: string;
                                properties: {
                                    size: {
                                        type: string;
                                    };
                                    locked?: undefined;
                                    type?: undefined;
                                    buffer?: undefined;
                                    byteLength?: undefined;
                                    byteOffset?: undefined;
                                };
                                required: string[];
                                additionalProperties: boolean;
                            } | {
                                type: string;
                                properties?: undefined;
                                required?: undefined;
                                additionalProperties?: undefined;
                            })[];
                            export { anyOf_3 as anyOf };
                        }
                        export { body_1 as body };
                        export namespace cache_1 {
                            let type_42: string;
                            export { type_42 as type };
                            let _enum_7: string[];
                            export { _enum_7 as enum };
                        }
                        export { cache_1 as cache };
                        export namespace credentials_1 {
                            let type_43: string;
                            export { type_43 as type };
                            let _enum_8: string[];
                            export { _enum_8 as enum };
                        }
                        export { credentials_1 as credentials };
                        export namespace headers_1 {
                            let anyOf_4: ({
                                type: string;
                                items: {
                                    type: string;
                                    items: {
                                        type: string;
                                    };
                                    minItems: number;
                                    maxItems: number;
                                };
                                additionalProperties?: undefined;
                            } | {
                                type: string;
                                additionalProperties: {
                                    type: string;
                                };
                                items?: undefined;
                            } | {
                                type: string;
                                additionalProperties: boolean;
                                items?: undefined;
                            })[];
                            export { anyOf_4 as anyOf };
                        }
                        export { headers_1 as headers };
                        export namespace integrity_1 {
                            let type_44: string;
                            export { type_44 as type };
                        }
                        export { integrity_1 as integrity };
                        export namespace keepalive_1 {
                            let type_45: string;
                            export { type_45 as type };
                        }
                        export { keepalive_1 as keepalive };
                        export namespace method_1 {
                            let type_46: string;
                            export { type_46 as type };
                        }
                        export { method_1 as method };
                        export namespace mode_1 {
                            let type_47: string;
                            export { type_47 as type };
                            let _enum_9: string[];
                            export { _enum_9 as enum };
                        }
                        export { mode_1 as mode };
                        export namespace priority_1 {
                            let type_48: string;
                            export { type_48 as type };
                            let _enum_10: string[];
                            export { _enum_10 as enum };
                        }
                        export { priority_1 as priority };
                        export namespace redirect_1 {
                            let type_49: string;
                            export { type_49 as type };
                            let _enum_11: string[];
                            export { _enum_11 as enum };
                        }
                        export { redirect_1 as redirect };
                        export namespace referrer_1 {
                            let type_50: string;
                            export { type_50 as type };
                        }
                        export { referrer_1 as referrer };
                        export namespace referrerPolicy_1 {
                            let type_51: string;
                            export { type_51 as type };
                            let _enum_12: string[];
                            export { _enum_12 as enum };
                        }
                        export { referrerPolicy_1 as referrerPolicy };
                        export namespace signal_1 {
                            let anyOf_5: ({
                                type: string;
                                properties: {
                                    aborted: {
                                        type: string;
                                    };
                                    onabort: {
                                        anyOf: ({
                                            type?: undefined;
                                        } | {
                                            type: string;
                                        })[];
                                    };
                                    reason: {};
                                };
                                required: string[];
                                additionalProperties: boolean;
                            } | {
                                type: string;
                                properties?: undefined;
                                required?: undefined;
                                additionalProperties?: undefined;
                            })[];
                            export { anyOf_5 as anyOf };
                        }
                        export { signal_1 as signal };
                        export namespace window_1 {
                            let type_52: string;
                            export { type_52 as type };
                        }
                        export { window_1 as window };
                    }
                    export { properties_13 as properties };
                    let additionalProperties_12: boolean;
                    export { additionalProperties_12 as additionalProperties };
                }
                export { fetchOptions_1 as fetchOptions };
                export namespace queue_1 {
                    let $ref_9: string;
                    export { $ref_9 as $ref };
                }
                export { queue_1 as queue };
            }
            export { properties_11 as properties };
            let additionalProperties_13: boolean;
            export { additionalProperties_13 as additionalProperties };
        }
        namespace ModuleOptions {
            let type_53: string;
            export { type_53 as type };
            export namespace properties_14 {
                export namespace devel_1 {
                    let type_54: string;
                    export { type_54 as type };
                    export namespace properties_15 {
                        export namespace id_1 {
                            let type_55: string;
                            export { type_55 as type };
                        }
                        export { id_1 as id };
                        let t_1: {};
                        export { t_1 as t };
                        let onFinish_1: {};
                        export { onFinish_1 as onFinish };
                    }
                    export { properties_15 as properties };
                    let required_7: string[];
                    export { required_7 as required };
                    let additionalProperties_14: boolean;
                    export { additionalProperties_14 as additionalProperties };
                }
                export { devel_1 as devel };
                let fetch_2: {};
                export { fetch_2 as fetch };
                export namespace fetchOptions_2 {
                    let type_56: string;
                    export { type_56 as type };
                    export namespace properties_16 {
                        export namespace body_2 {
                            let anyOf_6: ({
                                type: string;
                                properties: {
                                    locked: {
                                        type: string;
                                    };
                                    size?: undefined;
                                    type?: undefined;
                                    buffer?: undefined;
                                    byteLength?: undefined;
                                    byteOffset?: undefined;
                                };
                                required: string[];
                                additionalProperties: boolean;
                            } | {
                                type: string;
                                properties: {
                                    size: {
                                        type: string;
                                    };
                                    type: {
                                        type: string;
                                    };
                                    locked?: undefined;
                                    buffer?: undefined;
                                    byteLength?: undefined;
                                    byteOffset?: undefined;
                                };
                                required: string[];
                                additionalProperties: boolean;
                            } | {
                                type: string;
                                properties: {
                                    buffer: {
                                        type: string;
                                        properties: {
                                            byteLength: {
                                                type: string;
                                            };
                                        };
                                        required: string[];
                                        additionalProperties: boolean;
                                    };
                                    byteLength: {
                                        type: string;
                                    };
                                    byteOffset: {
                                        type: string;
                                    };
                                    locked?: undefined;
                                    size?: undefined;
                                    type?: undefined;
                                };
                                required: string[];
                                additionalProperties: boolean;
                            } | {
                                type: string;
                                properties: {
                                    byteLength: {
                                        type: string;
                                    };
                                    locked?: undefined;
                                    size?: undefined;
                                    type?: undefined;
                                    buffer?: undefined;
                                    byteOffset?: undefined;
                                };
                                required: string[];
                                additionalProperties: boolean;
                            } | {
                                type: string;
                                additionalProperties: boolean;
                                properties?: undefined;
                                required?: undefined;
                            } | {
                                type: string;
                                properties: {
                                    size: {
                                        type: string;
                                    };
                                    locked?: undefined;
                                    type?: undefined;
                                    buffer?: undefined;
                                    byteLength?: undefined;
                                    byteOffset?: undefined;
                                };
                                required: string[];
                                additionalProperties: boolean;
                            } | {
                                type: string;
                                properties?: undefined;
                                required?: undefined;
                                additionalProperties?: undefined;
                            })[];
                            export { anyOf_6 as anyOf };
                        }
                        export { body_2 as body };
                        export namespace cache_2 {
                            let type_57: string;
                            export { type_57 as type };
                            let _enum_13: string[];
                            export { _enum_13 as enum };
                        }
                        export { cache_2 as cache };
                        export namespace credentials_2 {
                            let type_58: string;
                            export { type_58 as type };
                            let _enum_14: string[];
                            export { _enum_14 as enum };
                        }
                        export { credentials_2 as credentials };
                        export namespace headers_2 {
                            let anyOf_7: ({
                                type: string;
                                items: {
                                    type: string;
                                    items: {
                                        type: string;
                                    };
                                    minItems: number;
                                    maxItems: number;
                                };
                                additionalProperties?: undefined;
                            } | {
                                type: string;
                                additionalProperties: {
                                    type: string;
                                };
                                items?: undefined;
                            } | {
                                type: string;
                                additionalProperties: boolean;
                                items?: undefined;
                            })[];
                            export { anyOf_7 as anyOf };
                        }
                        export { headers_2 as headers };
                        export namespace integrity_2 {
                            let type_59: string;
                            export { type_59 as type };
                        }
                        export { integrity_2 as integrity };
                        export namespace keepalive_2 {
                            let type_60: string;
                            export { type_60 as type };
                        }
                        export { keepalive_2 as keepalive };
                        export namespace method_2 {
                            let type_61: string;
                            export { type_61 as type };
                        }
                        export { method_2 as method };
                        export namespace mode_2 {
                            let type_62: string;
                            export { type_62 as type };
                            let _enum_15: string[];
                            export { _enum_15 as enum };
                        }
                        export { mode_2 as mode };
                        export namespace priority_2 {
                            let type_63: string;
                            export { type_63 as type };
                            let _enum_16: string[];
                            export { _enum_16 as enum };
                        }
                        export { priority_2 as priority };
                        export namespace redirect_2 {
                            let type_64: string;
                            export { type_64 as type };
                            let _enum_17: string[];
                            export { _enum_17 as enum };
                        }
                        export { redirect_2 as redirect };
                        export namespace referrer_2 {
                            let type_65: string;
                            export { type_65 as type };
                        }
                        export { referrer_2 as referrer };
                        export namespace referrerPolicy_2 {
                            let type_66: string;
                            export { type_66 as type };
                            let _enum_18: string[];
                            export { _enum_18 as enum };
                        }
                        export { referrerPolicy_2 as referrerPolicy };
                        export namespace signal_2 {
                            let anyOf_8: ({
                                type: string;
                                properties: {
                                    aborted: {
                                        type: string;
                                    };
                                    onabort: {
                                        anyOf: ({
                                            type?: undefined;
                                        } | {
                                            type: string;
                                        })[];
                                    };
                                    reason: {};
                                };
                                required: string[];
                                additionalProperties: boolean;
                            } | {
                                type: string;
                                properties?: undefined;
                                required?: undefined;
                                additionalProperties?: undefined;
                            })[];
                            export { anyOf_8 as anyOf };
                        }
                        export { signal_2 as signal };
                        export namespace window_2 {
                            let type_67: string;
                            export { type_67 as type };
                        }
                        export { window_2 as window };
                    }
                    export { properties_16 as properties };
                    let additionalProperties_15: boolean;
                    export { additionalProperties_15 as additionalProperties };
                }
                export { fetchOptions_2 as fetchOptions };
                export namespace queue_2 {
                    let $ref_10: string;
                    export { $ref_10 as $ref };
                }
                export { queue_2 as queue };
                export namespace validateOptions_1 {
                    let type_68: string;
                    export { type_68 as type };
                }
                export { validateOptions_1 as validateOptions };
                export namespace validateResult {
                    let type_69: string;
                    export { type_69 as type };
                }
            }
            export { properties_14 as properties };
            let additionalProperties_16: boolean;
            export { additionalProperties_16 as additionalProperties };
        }
        namespace ModuleOptionsWithValidateFalse {
            let type_70: string;
            export { type_70 as type };
            export namespace properties_17 {
                export namespace devel_2 {
                    let type_71: string;
                    export { type_71 as type };
                    export namespace properties_18 {
                        export namespace id_2 {
                            let type_72: string;
                            export { type_72 as type };
                        }
                        export { id_2 as id };
                        let t_2: {};
                        export { t_2 as t };
                        let onFinish_2: {};
                        export { onFinish_2 as onFinish };
                    }
                    export { properties_18 as properties };
                    let required_8: string[];
                    export { required_8 as required };
                    let additionalProperties_17: boolean;
                    export { additionalProperties_17 as additionalProperties };
                }
                export { devel_2 as devel };
                let fetch_3: {};
                export { fetch_3 as fetch };
                export namespace fetchOptions_3 {
                    let type_73: string;
                    export { type_73 as type };
                    export namespace properties_19 {
                        export namespace body_3 {
                            let anyOf_9: ({
                                type: string;
                                properties: {
                                    locked: {
                                        type: string;
                                    };
                                    size?: undefined;
                                    type?: undefined;
                                    buffer?: undefined;
                                    byteLength?: undefined;
                                    byteOffset?: undefined;
                                };
                                required: string[];
                                additionalProperties: boolean;
                            } | {
                                type: string;
                                properties: {
                                    size: {
                                        type: string;
                                    };
                                    type: {
                                        type: string;
                                    };
                                    locked?: undefined;
                                    buffer?: undefined;
                                    byteLength?: undefined;
                                    byteOffset?: undefined;
                                };
                                required: string[];
                                additionalProperties: boolean;
                            } | {
                                type: string;
                                properties: {
                                    buffer: {
                                        type: string;
                                        properties: {
                                            byteLength: {
                                                type: string;
                                            };
                                        };
                                        required: string[];
                                        additionalProperties: boolean;
                                    };
                                    byteLength: {
                                        type: string;
                                    };
                                    byteOffset: {
                                        type: string;
                                    };
                                    locked?: undefined;
                                    size?: undefined;
                                    type?: undefined;
                                };
                                required: string[];
                                additionalProperties: boolean;
                            } | {
                                type: string;
                                properties: {
                                    byteLength: {
                                        type: string;
                                    };
                                    locked?: undefined;
                                    size?: undefined;
                                    type?: undefined;
                                    buffer?: undefined;
                                    byteOffset?: undefined;
                                };
                                required: string[];
                                additionalProperties: boolean;
                            } | {
                                type: string;
                                additionalProperties: boolean;
                                properties?: undefined;
                                required?: undefined;
                            } | {
                                type: string;
                                properties: {
                                    size: {
                                        type: string;
                                    };
                                    locked?: undefined;
                                    type?: undefined;
                                    buffer?: undefined;
                                    byteLength?: undefined;
                                    byteOffset?: undefined;
                                };
                                required: string[];
                                additionalProperties: boolean;
                            } | {
                                type: string;
                                properties?: undefined;
                                required?: undefined;
                                additionalProperties?: undefined;
                            })[];
                            export { anyOf_9 as anyOf };
                        }
                        export { body_3 as body };
                        export namespace cache_3 {
                            let type_74: string;
                            export { type_74 as type };
                            let _enum_19: string[];
                            export { _enum_19 as enum };
                        }
                        export { cache_3 as cache };
                        export namespace credentials_3 {
                            let type_75: string;
                            export { type_75 as type };
                            let _enum_20: string[];
                            export { _enum_20 as enum };
                        }
                        export { credentials_3 as credentials };
                        export namespace headers_3 {
                            let anyOf_10: ({
                                type: string;
                                items: {
                                    type: string;
                                    items: {
                                        type: string;
                                    };
                                    minItems: number;
                                    maxItems: number;
                                };
                                additionalProperties?: undefined;
                            } | {
                                type: string;
                                additionalProperties: {
                                    type: string;
                                };
                                items?: undefined;
                            } | {
                                type: string;
                                additionalProperties: boolean;
                                items?: undefined;
                            })[];
                            export { anyOf_10 as anyOf };
                        }
                        export { headers_3 as headers };
                        export namespace integrity_3 {
                            let type_76: string;
                            export { type_76 as type };
                        }
                        export { integrity_3 as integrity };
                        export namespace keepalive_3 {
                            let type_77: string;
                            export { type_77 as type };
                        }
                        export { keepalive_3 as keepalive };
                        export namespace method_3 {
                            let type_78: string;
                            export { type_78 as type };
                        }
                        export { method_3 as method };
                        export namespace mode_3 {
                            let type_79: string;
                            export { type_79 as type };
                            let _enum_21: string[];
                            export { _enum_21 as enum };
                        }
                        export { mode_3 as mode };
                        export namespace priority_3 {
                            let type_80: string;
                            export { type_80 as type };
                            let _enum_22: string[];
                            export { _enum_22 as enum };
                        }
                        export { priority_3 as priority };
                        export namespace redirect_3 {
                            let type_81: string;
                            export { type_81 as type };
                            let _enum_23: string[];
                            export { _enum_23 as enum };
                        }
                        export { redirect_3 as redirect };
                        export namespace referrer_3 {
                            let type_82: string;
                            export { type_82 as type };
                        }
                        export { referrer_3 as referrer };
                        export namespace referrerPolicy_3 {
                            let type_83: string;
                            export { type_83 as type };
                            let _enum_24: string[];
                            export { _enum_24 as enum };
                        }
                        export { referrerPolicy_3 as referrerPolicy };
                        export namespace signal_3 {
                            let anyOf_11: ({
                                type: string;
                                properties: {
                                    aborted: {
                                        type: string;
                                    };
                                    onabort: {
                                        anyOf: ({
                                            type?: undefined;
                                        } | {
                                            type: string;
                                        })[];
                                    };
                                    reason: {};
                                };
                                required: string[];
                                additionalProperties: boolean;
                            } | {
                                type: string;
                                properties?: undefined;
                                required?: undefined;
                                additionalProperties?: undefined;
                            })[];
                            export { anyOf_11 as anyOf };
                        }
                        export { signal_3 as signal };
                        export namespace window_3 {
                            let type_84: string;
                            export { type_84 as type };
                        }
                        export { window_3 as window };
                    }
                    export { properties_19 as properties };
                    let additionalProperties_18: boolean;
                    export { additionalProperties_18 as additionalProperties };
                }
                export { fetchOptions_3 as fetchOptions };
                export namespace queue_3 {
                    let $ref_11: string;
                    export { $ref_11 as $ref };
                }
                export { queue_3 as queue };
                export namespace validateOptions_2 {
                    let type_85: string;
                    export { type_85 as type };
                }
                export { validateOptions_2 as validateOptions };
                export namespace validateResult_1 {
                    let type_86: string;
                    export { type_86 as type };
                    let _const: boolean;
                    export { _const as const };
                }
                export { validateResult_1 as validateResult };
            }
            export { properties_17 as properties };
            let required_9: string[];
            export { required_9 as required };
            let additionalProperties_19: boolean;
            export { additionalProperties_19 as additionalProperties };
        }
        namespace ModuleOptionsWithValidateTrue {
            let type_87: string;
            export { type_87 as type };
            export namespace properties_20 {
                export namespace devel_3 {
                    let type_88: string;
                    export { type_88 as type };
                    export namespace properties_21 {
                        export namespace id_3 {
                            let type_89: string;
                            export { type_89 as type };
                        }
                        export { id_3 as id };
                        let t_3: {};
                        export { t_3 as t };
                        let onFinish_3: {};
                        export { onFinish_3 as onFinish };
                    }
                    export { properties_21 as properties };
                    let required_10: string[];
                    export { required_10 as required };
                    let additionalProperties_20: boolean;
                    export { additionalProperties_20 as additionalProperties };
                }
                export { devel_3 as devel };
                let fetch_4: {};
                export { fetch_4 as fetch };
                export namespace fetchOptions_4 {
                    let type_90: string;
                    export { type_90 as type };
                    export namespace properties_22 {
                        export namespace body_4 {
                            let anyOf_12: ({
                                type: string;
                                properties: {
                                    locked: {
                                        type: string;
                                    };
                                    size?: undefined;
                                    type?: undefined;
                                    buffer?: undefined;
                                    byteLength?: undefined;
                                    byteOffset?: undefined;
                                };
                                required: string[];
                                additionalProperties: boolean;
                            } | {
                                type: string;
                                properties: {
                                    size: {
                                        type: string;
                                    };
                                    type: {
                                        type: string;
                                    };
                                    locked?: undefined;
                                    buffer?: undefined;
                                    byteLength?: undefined;
                                    byteOffset?: undefined;
                                };
                                required: string[];
                                additionalProperties: boolean;
                            } | {
                                type: string;
                                properties: {
                                    buffer: {
                                        type: string;
                                        properties: {
                                            byteLength: {
                                                type: string;
                                            };
                                        };
                                        required: string[];
                                        additionalProperties: boolean;
                                    };
                                    byteLength: {
                                        type: string;
                                    };
                                    byteOffset: {
                                        type: string;
                                    };
                                    locked?: undefined;
                                    size?: undefined;
                                    type?: undefined;
                                };
                                required: string[];
                                additionalProperties: boolean;
                            } | {
                                type: string;
                                properties: {
                                    byteLength: {
                                        type: string;
                                    };
                                    locked?: undefined;
                                    size?: undefined;
                                    type?: undefined;
                                    buffer?: undefined;
                                    byteOffset?: undefined;
                                };
                                required: string[];
                                additionalProperties: boolean;
                            } | {
                                type: string;
                                additionalProperties: boolean;
                                properties?: undefined;
                                required?: undefined;
                            } | {
                                type: string;
                                properties: {
                                    size: {
                                        type: string;
                                    };
                                    locked?: undefined;
                                    type?: undefined;
                                    buffer?: undefined;
                                    byteLength?: undefined;
                                    byteOffset?: undefined;
                                };
                                required: string[];
                                additionalProperties: boolean;
                            } | {
                                type: string;
                                properties?: undefined;
                                required?: undefined;
                                additionalProperties?: undefined;
                            })[];
                            export { anyOf_12 as anyOf };
                        }
                        export { body_4 as body };
                        export namespace cache_4 {
                            let type_91: string;
                            export { type_91 as type };
                            let _enum_25: string[];
                            export { _enum_25 as enum };
                        }
                        export { cache_4 as cache };
                        export namespace credentials_4 {
                            let type_92: string;
                            export { type_92 as type };
                            let _enum_26: string[];
                            export { _enum_26 as enum };
                        }
                        export { credentials_4 as credentials };
                        export namespace headers_4 {
                            let anyOf_13: ({
                                type: string;
                                items: {
                                    type: string;
                                    items: {
                                        type: string;
                                    };
                                    minItems: number;
                                    maxItems: number;
                                };
                                additionalProperties?: undefined;
                            } | {
                                type: string;
                                additionalProperties: {
                                    type: string;
                                };
                                items?: undefined;
                            } | {
                                type: string;
                                additionalProperties: boolean;
                                items?: undefined;
                            })[];
                            export { anyOf_13 as anyOf };
                        }
                        export { headers_4 as headers };
                        export namespace integrity_4 {
                            let type_93: string;
                            export { type_93 as type };
                        }
                        export { integrity_4 as integrity };
                        export namespace keepalive_4 {
                            let type_94: string;
                            export { type_94 as type };
                        }
                        export { keepalive_4 as keepalive };
                        export namespace method_4 {
                            let type_95: string;
                            export { type_95 as type };
                        }
                        export { method_4 as method };
                        export namespace mode_4 {
                            let type_96: string;
                            export { type_96 as type };
                            let _enum_27: string[];
                            export { _enum_27 as enum };
                        }
                        export { mode_4 as mode };
                        export namespace priority_4 {
                            let type_97: string;
                            export { type_97 as type };
                            let _enum_28: string[];
                            export { _enum_28 as enum };
                        }
                        export { priority_4 as priority };
                        export namespace redirect_4 {
                            let type_98: string;
                            export { type_98 as type };
                            let _enum_29: string[];
                            export { _enum_29 as enum };
                        }
                        export { redirect_4 as redirect };
                        export namespace referrer_4 {
                            let type_99: string;
                            export { type_99 as type };
                        }
                        export { referrer_4 as referrer };
                        export namespace referrerPolicy_4 {
                            let type_100: string;
                            export { type_100 as type };
                            let _enum_30: string[];
                            export { _enum_30 as enum };
                        }
                        export { referrerPolicy_4 as referrerPolicy };
                        export namespace signal_4 {
                            let anyOf_14: ({
                                type: string;
                                properties: {
                                    aborted: {
                                        type: string;
                                    };
                                    onabort: {
                                        anyOf: ({
                                            type?: undefined;
                                        } | {
                                            type: string;
                                        })[];
                                    };
                                    reason: {};
                                };
                                required: string[];
                                additionalProperties: boolean;
                            } | {
                                type: string;
                                properties?: undefined;
                                required?: undefined;
                                additionalProperties?: undefined;
                            })[];
                            export { anyOf_14 as anyOf };
                        }
                        export { signal_4 as signal };
                        export namespace window_4 {
                            let type_101: string;
                            export { type_101 as type };
                        }
                        export { window_4 as window };
                    }
                    export { properties_22 as properties };
                    let additionalProperties_21: boolean;
                    export { additionalProperties_21 as additionalProperties };
                }
                export { fetchOptions_4 as fetchOptions };
                export namespace queue_4 {
                    let $ref_12: string;
                    export { $ref_12 as $ref };
                }
                export { queue_4 as queue };
                export namespace validateOptions_3 {
                    let type_102: string;
                    export { type_102 as type };
                }
                export { validateOptions_3 as validateOptions };
                export namespace validateResult_2 {
                    let type_103: string;
                    export { type_103 as type };
                    let _const_1: boolean;
                    export { _const_1 as const };
                }
                export { validateResult_2 as validateResult };
            }
            export { properties_20 as properties };
            let additionalProperties_22: boolean;
            export { additionalProperties_22 as additionalProperties };
        }
        namespace ModuleThis {
            let type_104: string;
            export { type_104 as type };
            export namespace properties_23 {
                let _moduleExec: {};
            }
            export { properties_23 as properties };
            let required_11: string[];
            export { required_11 as required };
        }
        namespace ModuleError {
            let type_105: string;
            export { type_105 as type };
            export namespace properties_24 {
                namespace name {
                    let type_106: string;
                    export { type_106 as type };
                }
                namespace message {
                    let type_107: string;
                    export { type_107 as type };
                }
                namespace stack {
                    let type_108: string;
                    export { type_108 as type };
                }
            }
            export { properties_24 as properties };
            let required_12: string[];
            export { required_12 as required };
            let additionalProperties_23: boolean;
            export { additionalProperties_23 as additionalProperties };
        }
    }
}
export default _default;
//# sourceMappingURL=options.schema.d.ts.map