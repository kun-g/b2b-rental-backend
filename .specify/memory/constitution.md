<!--
Sync Impact Report
Version change: N/A → 1.0.0
Modified principles:
- 新增：I. 代码质量守则
- 新增：II. 全量测试准则
- 新增：III. 性能与容量基线
- 新增：IV. 可观测性与质量反馈
- 新增：V. 变更审查与持续改进
Added sections:
- 工程基线与工具
- 开发流程与质量门禁
Removed sections:
- 无
Templates requiring updates:
- ✅ .specify/templates/plan-template.md
- ✅ .specify/templates/spec-template.md
- ✅ .specify/templates/tasks-template.md
Follow-up TODOs:
- 无
-->
# B2B 租赁后端 Monorepo Constitution

## Core Principles

### I. 代码质量守则
- 所有合并到 `main` 的改动必须通过 `pnpm lint`、`pnpm format --check` 与 `pnpm turbo run build`，并在 PR 中附上最新一次执行记录。
- 新增或修改的 TypeScript 代码不得引入 `any`、`unknown` 或 `@ts-ignore`，若确需豁免必须在 PR 中附 Tech Lead 批准原因。
- 公共接口或共享包发生行为变化时必须同步更新 `specs/` 文档或 `README.md`，确保实现与说明一致。
理由：统一的静态质量门槛和同步文档可以阻断缺陷在 monorepo 内扩散。

### II. 全量测试准则
- 实现任一用户故事前必须先在 `specs/[feature]/` 中定义可执行测试场景，并编写会失败的测试后再实现功能。
- 所有核心逻辑必须具备单元测试，跨服务调用必须通过契约或集成测试，并使用 `pnpm turbo run test --filter ...` 覆盖受影响范围。
- 发布前必须展示最近一次测试的失败→通过记录（CI 日志或截图），否则 Reviewer 必须拒绝合并。
理由：先行测试确保需求可验证，防止回归并支撑持续交付。

### III. 性能与容量基线
- `apps/core` HTTP API 在预生产环境以 100 req/s 压测时，读请求 p95 延迟不得超过 300ms，写请求 p95 不得超过 500ms。
- 单个请求不得触发超过 3 次数据库往返，需通过 Prisma 查询日志验证并在 PR 中记录优化策略。
- 引入第三方依赖或算法变更前必须提交性能对比（基线数据存放于 `docs/perf/`），若性能下降超过 5%，需附缓解方案。
理由：明确的性能预算可防止后端瓶颈阻塞租赁业务峰值负载。

### IV. 可观测性与质量反馈
- 所有服务必须输出结构化 JSON 日志，包含 `requestId`、`tenantId`、耗时与错误详情，禁止裸字符串日志。
- `apps/core` 与 `apps/cms` 必须暴露 `/metrics` 或等效监控端点，至少包含请求计数、延迟直方图与错误率。
- 每次发布后 24 小时内必须回顾监控面板并将结论记录在 `docs/release-notes/`，发现异常需立即创建修复任务。
理由：可观测性是验证质量与性能承诺的唯一途径。

### V. 变更审查与持续改进
- 所有 PR 必须至少获得一名非提交者审查，并依据质量、测试、性能三项检查清单逐项确认。
- 涉及跨团队或共享包的改动必须在规划阶段于 `specs/[feature]/plan.md` 标注影响范围与依赖关系，再在 `tasks.md` 中落实。
- 每季度需对照本宪章开展一次执行回顾并存档于 `docs/audit/`，形成差距与改进计划。
理由：系统化的治理流程确保标准随时间持续兑现。

## 工程基线与工具

- `pnpm` 为唯一允许的包管理器，所有构建、测试与格式化命令通过 `turbo` 调度，禁止直接使用 `npm` 或 `yarn`。
- 静态检查命令：`pnpm lint`、`pnpm format --check`、`pnpm turbo run build`，必须在 PR 检查项中列举并通过。
- 性能基线结果统一记录在 `docs/perf/benchmarks.md`，压测脚本与原始数据需存放在同一目录便于复现。
- 日志与监控配置应集中维护在各服务的 `config/observability` 模块，变更需同步更新运维手册。

## 开发流程与质量门禁

1. 在 `specs/[feature]/spec.md` 定义用户故事、测试场景与性能指标，确保每个故事具备独立可验证的验收条件。
2. 利用 `specs/[feature]/plan.md` 说明如何满足宪章原则中的质量、测试、性能检查，并在 Constitution Check 小节逐项确认。
3. `specs/[feature]/tasks.md` 必须为每个用户故事安排测试任务（单元、契约或集成）与性能验证任务，且测试任务排在实现任务之前。
4. PR 模板需附上质量检查项（lint/build）、测试记录（含失败→通过证明）与性能评估（若涉及性能敏感变更）。
5. 发布前由责任人执行监控验证与文档更新，未完成者不得打标签或部署。

## Governance

- 本宪章优先级高于其他开发指南，所有流程与模板必须与之保持一致。
- 修订宪章需提交 ADR 或等效设计文档，说明变更原因、影响范围与计划中的培训或工具更新，获两位领域负责人批准后方可合并。
- 版本管理遵循语义化：破坏性调整提升主版本，新增原则或大幅扩充内容提升次版本，文字澄清使用修订号。
- 每次修订须在 README 或相关运行文档中同步提及，并更新适用模板；若无法立即完成，应在 Sync Impact Report 中记录 TODO 并跟踪。
- 合规审查：每个季度回顾由平台团队主持，抽样检查最近 3 个特性是否满足本宪章，发现违规需在两周内纠正。

**Version**: 1.0.0 | **Ratified**: 2025-10-07 | **Last Amended**: 2025-10-07
