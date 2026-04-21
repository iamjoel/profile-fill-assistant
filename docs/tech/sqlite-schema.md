# SQLite 表设计

以下为 MVP 阶段建议的 SQLite 表设计文档。目标不是一次性覆盖所有长期扩展需求，而是先满足扫描、转换、按人聚合、字段冲突、来源追溯、待填文件会话这 6 类核心能力。

可视化页面：
- [docs/tech/sqlite-schema-visualizer.html](/Users/joel/joel/profile-fill-assistant/docs/tech/sqlite-schema-visualizer.html:1)

## 设计原则
- 一张表只负责一种主职责，避免把扫描状态、聚合结果、问答上下文混在一起。
- 对“当前最终结果”和“候选明细”分表存储，既方便查询，也方便保留冲突。
- 对可变结构优先使用固定列 + JSON 扩展字段的方式，避免首版 schema 过度复杂。
- 所有会影响用户判断的关键结果都要保留 `created_at` / `updated_at`。

## 表 1：`scan_jobs`
用途：
- 记录一次扫描任务的元信息，对应 FR-11 的扫描日志与可见性。

关键字段：

| 字段名 | 类型 | 说明 |
| --- | --- | --- |
| `scan_job_id` | `TEXT` | 主键，建议使用 UUID |
| `root_path` | `TEXT` | 本次扫描的根目录 |
| `scan_mode` | `TEXT` | `full` / `incremental` |
| `status` | `TEXT` | `running` / `success` / `partial_success` / `failed` |
| `started_at` | `TEXT` | 扫描开始时间 |
| `finished_at` | `TEXT` | 扫描结束时间，可为空 |
| `processed_file_count` | `INTEGER` | 实际处理文件数 |
| `skipped_file_count` | `INTEGER` | 跳过文件数 |
| `failed_file_count` | `INTEGER` | 失败文件数 |
| `person_count` | `INTEGER` | 本次聚合后人数 |
| `error_summary` | `TEXT` | 错误摘要，可为空 |
| `created_at` | `TEXT` | 记录创建时间 |
| `updated_at` | `TEXT` | 记录更新时间 |

索引建议：
- `idx_scan_jobs_started_at`
- `idx_scan_jobs_status`

## 表 2：`source_records`
用途：
- 记录每个源文件的扫描、解析、抽取状态，是文件级主表。

关键字段：

| 字段名 | 类型 | 说明 |
| --- | --- | --- |
| `source_id` | `TEXT` | 主键 |
| `scan_job_id` | `TEXT` | 关联 `scan_jobs.scan_job_id` |
| `file_name` | `TEXT` | 文件名 |
| `file_path` | `TEXT` | 原始文件绝对路径，唯一 |
| `file_type` | `TEXT` | `doc` / `docx` / `xlsx` / `xls` / `csv` / `md` / `txt` |
| `file_fingerprint` | `TEXT` | 文件哈希或等效指纹 |
| `file_mtime` | `TEXT` | 文件最后修改时间 |
| `file_size` | `INTEGER` | 文件大小 |
| `scan_status` | `TEXT` | `pending` / `scanned` / `skipped` / `deleted` |
| `extract_status` | `TEXT` | `success` / `partial_success` / `failed` / `skipped` |
| `extract_error` | `TEXT` | 抽取失败原因，可为空 |
| `extracted_at` | `TEXT` | 最近抽取时间，可为空 |
| `created_at` | `TEXT` | 记录创建时间 |
| `updated_at` | `TEXT` | 记录更新时间 |

索引建议：
- `uniq_source_records_file_path`
- `idx_source_records_fingerprint`
- `idx_source_records_scan_job_id`
- `idx_source_records_extract_status`

## 表 3：`conversion_records`
用途：
- 记录 `doc -> docx` 转换映射，满足 FR-3 与 FR-8 的可追溯要求。

关键字段：

| 字段名 | 类型 | 说明 |
| --- | --- | --- |
| `conversion_id` | `TEXT` | 主键 |
| `source_id` | `TEXT` | 关联 `source_records.source_id` |
| `source_doc_path` | `TEXT` | 原始 `doc` 路径 |
| `converted_docx_path` | `TEXT` | 转换后 `docx` 路径 |
| `conversion_status` | `TEXT` | `success` / `failed` |
| `converter_name` | `TEXT` | 转换器名称或实现标识 |
| `error_message` | `TEXT` | 转换失败原因，可为空 |
| `converted_at` | `TEXT` | 转换时间 |
| `created_at` | `TEXT` | 记录创建时间 |
| `updated_at` | `TEXT` | 记录更新时间 |

索引建议：
- `uniq_conversion_records_source_id`
- `idx_conversion_records_status`

## 表 4：`person_profiles`
用途：
- 保存按人聚合后的主实体，是人员列表和人员工作台的主查询表。

关键字段：

| 字段名 | 类型 | 说明 |
| --- | --- | --- |
| `person_id` | `TEXT` | 主键 |
| `display_name` | `TEXT` | 默认展示姓名 |
| `aliases_json` | `TEXT` | 别名列表，JSON 数组 |
| `identity_keys_json` | `TEXT` | 证件号、手机号、邮箱等主身份线索，JSON 对象 |
| `merge_confidence` | `REAL` | 当前聚合置信度 |
| `profile_status` | `TEXT` | `active` / `merged_pending_review` / `archived` |
| `completeness_score` | `REAL` | 资料完整度，0-1 |
| `conflict_count` | `INTEGER` | 当前冲突字段数 |
| `person_md_path` | `TEXT` | `workspace/people/` 下 Markdown 路径 |
| `last_scanned_at` | `TEXT` | 最近一次参与聚合时间 |
| `created_at` | `TEXT` | 创建时间 |
| `updated_at` | `TEXT` | 更新时间 |

索引建议：
- `idx_person_profiles_display_name`
- `idx_person_profiles_conflict_count`
- `idx_person_profiles_updated_at`

## 表 5：`field_entries`
用途：
- 保存某个人某个字段的“当前最终状态”，服务资料概览和待填文件默认摘要。

关键字段：

| 字段名 | 类型 | 说明 |
| --- | --- | --- |
| `field_entry_id` | `TEXT` | 主键 |
| `person_id` | `TEXT` | 关联 `person_profiles.person_id` |
| `field_key` | `TEXT` | 例如 `phone`、`graduation_school` |
| `canonical_value` | `TEXT` | 当前最终值，可为空 |
| `status` | `TEXT` | `confirmed` / `conflict` / `missing` / `candidate` |
| `confidence` | `REAL` | 当前值置信度 |
| `confirmed_by_user` | `INTEGER` | 0 / 1 |
| `confirmed_at` | `TEXT` | 人工确认时间，可为空 |
| `primary_source_id` | `TEXT` | 主来源，可为空 |
| `source_count` | `INTEGER` | 该字段关联来源数 |
| `notes` | `TEXT` | 备注，可为空 |
| `created_at` | `TEXT` | 创建时间 |
| `updated_at` | `TEXT` | 更新时间 |

约束建议：
- `person_id + field_key` 唯一，确保每个人每个字段只有一条当前结果。

索引建议：
- `uniq_field_entries_person_field`
- `idx_field_entries_status`
- `idx_field_entries_primary_source_id`

## 表 6：`field_candidates`
用途：
- 保存字段候选值明细，用于冲突核对、来源展示和审计追溯。

关键字段：

| 字段名 | 类型 | 说明 |
| --- | --- | --- |
| `candidate_id` | `TEXT` | 主键 |
| `field_entry_id` | `TEXT` | 关联 `field_entries.field_entry_id` |
| `person_id` | `TEXT` | 冗余存储，便于按人查询 |
| `field_key` | `TEXT` | 冗余存储，便于按字段查询 |
| `candidate_value` | `TEXT` | 候选值 |
| `normalized_value` | `TEXT` | 归一化后的值 |
| `source_id` | `TEXT` | 关联 `source_records.source_id` |
| `source_excerpt` | `TEXT` | 原文片段或定位信息 |
| `confidence` | `REAL` | 候选值置信度 |
| `is_selected` | `INTEGER` | 0 / 1，是否当前被选中 |
| `is_user_selected` | `INTEGER` | 0 / 1，是否用户手工选择 |
| `extracted_at` | `TEXT` | 候选值抽取时间 |
| `created_at` | `TEXT` | 创建时间 |
| `updated_at` | `TEXT` | 更新时间 |

索引建议：
- `idx_field_candidates_field_entry_id`
- `idx_field_candidates_person_field`
- `idx_field_candidates_source_id`
- `idx_field_candidates_is_selected`

说明：
- `field_entries` 存“当前结果”，`field_candidates` 存“候选明细”，两者分离后，列表查询和冲突核对都更直接。

## 表 7：`conflict_records`
用途：
- 保存人员级和字段级的冲突摘要，便于人员列表、冲突筛选和冲突工作台快速查询。

关键字段：

| 字段名 | 类型 | 说明 |
| --- | --- | --- |
| `conflict_id` | `TEXT` | 主键 |
| `person_id` | `TEXT` | 关联 `person_profiles.person_id` |
| `field_entry_id` | `TEXT` | 关联 `field_entries.field_entry_id` |
| `field_key` | `TEXT` | 冲突字段 |
| `candidate_count` | `INTEGER` | 候选值数量 |
| `resolution_status` | `TEXT` | `open` / `resolved` / `ignored` |
| `resolved_value` | `TEXT` | 解决后的值，可为空 |
| `resolved_by_user` | `INTEGER` | 0 / 1 |
| `resolved_at` | `TEXT` | 解决时间，可为空 |
| `person_md_path` | `TEXT` | 对应人员 Markdown 路径 |
| `created_at` | `TEXT` | 创建时间 |
| `updated_at` | `TEXT` | 更新时间 |

索引建议：
- `idx_conflict_records_person_id`
- `idx_conflict_records_resolution_status`
- `idx_conflict_records_field_key`

## 表 8：`form_sessions`
用途：
- 记录一次待填文件打开会话，支撑“打开文件后默认推荐候选人和右侧问答”。

关键字段：

| 字段名 | 类型 | 说明 |
| --- | --- | --- |
| `session_id` | `TEXT` | 主键 |
| `opened_file_path` | `TEXT` | 当前打开文件路径 |
| `opened_file_type` | `TEXT` | 文件类型 |
| `content_snapshot` | `TEXT` | 当前已解析内容快照 |
| `context_entities_json` | `TEXT` | 从文件中提取的姓名、单位、学校等上下文，JSON 对象 |
| `matched_person_id` | `TEXT` | 当前默认匹配人员，可为空 |
| `match_status` | `TEXT` | `matched` / `ambiguous` / `unmatched` |
| `opened_at` | `TEXT` | 打开时间 |
| `last_active_at` | `TEXT` | 最近活跃时间 |
| `created_at` | `TEXT` | 创建时间 |
| `updated_at` | `TEXT` | 更新时间 |

索引建议：
- `idx_form_sessions_opened_file_path`
- `idx_form_sessions_match_status`
- `idx_form_sessions_last_active_at`

## 表 9：`form_session_candidates`
用途：
- 保存某次待填文件会话下的候选人排序结果，支撑“当前匹配到的候选人员”区域。

关键字段：

| 字段名 | 类型 | 说明 |
| --- | --- | --- |
| `session_candidate_id` | `TEXT` | 主键 |
| `session_id` | `TEXT` | 关联 `form_sessions.session_id` |
| `person_id` | `TEXT` | 关联 `person_profiles.person_id` |
| `match_score` | `REAL` | 匹配得分 |
| `match_reasons_json` | `TEXT` | 命中线索说明，JSON 数组 |
| `rank_no` | `INTEGER` | 候选排序 |
| `created_at` | `TEXT` | 创建时间 |
| `updated_at` | `TEXT` | 更新时间 |

约束建议：
- `session_id + person_id` 唯一。

索引建议：
- `uniq_form_session_candidates_session_person`
- `idx_form_session_candidates_session_rank`

## 表关系说明
核心关系如下：
- `scan_jobs` 1 对多 `source_records`
- `source_records` 1 对 0/1 `conversion_records`
- `person_profiles` 1 对多 `field_entries`
- `field_entries` 1 对多 `field_candidates`
- `person_profiles` 1 对多 `conflict_records`
- `form_sessions` 1 对多 `form_session_candidates`
- `form_session_candidates` 多对 1 `person_profiles`

## 枚举值建议
为避免前后端和数据层各自定义状态，建议首版统一以下枚举值：

| 枚举字段 | 建议值 |
| --- | --- |
| `scan_mode` | `full`、`incremental` |
| `scan_jobs.status` | `running`、`success`、`partial_success`、`failed` |
| `source_records.scan_status` | `pending`、`scanned`、`skipped`、`deleted` |
| `source_records.extract_status` | `success`、`partial_success`、`failed`、`skipped` |
| `field_entries.status` | `confirmed`、`conflict`、`missing`、`candidate` |
| `conflict_records.resolution_status` | `open`、`resolved`、`ignored` |
| `form_sessions.match_status` | `matched`、`ambiguous`、`unmatched` |

## 首版实现建议
- SQLite 时间字段统一使用 ISO 8601 字符串，便于调试和跨语言处理。
- JSON 字段统一使用 `TEXT` 存储，首版不强依赖 SQLite JSON 扩展能力。
- 文件路径建议保存绝对路径，避免工作目录变化导致追溯失效。
- 真正高频查询优先依赖 `person_profiles`、`field_entries`、`conflict_records` 这 3 张结果表，避免页面层直接扫候选明细表。
