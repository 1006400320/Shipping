# 物流系统方案：发货过程管控与费用闭环

## 1. 系统定位

本系统面向内部发货物流流程，核心不是通用仓储或运输调度，而是围绕以下业务闭环：

```text
发货资料完善 -> 打印 -> 扫码拣配 -> 扫码抽检 -> 扫码封箱 -> DNA 录入 -> 确认发厂 -> 物流单号 -> 运输/签收 -> 对账 -> 报销
```

第一版重点解决：

- 发货流程状态可控
- 拣配、抽检、封箱全程扫码
- 大件产品 DNA 录入强校验
- 物流单号、签收、作废可追踪
- 物流费用对账、改价确认、报销闭环

## 2. 角色与职责

| 角色 | 主要职责 |
| --- | --- |
| 发货资料维护人 | 完善发货资料、维护物料清单、打印单据 |
| 包管员 | 使用扫码枪拣配物料、确认拣配完成 |
| 质量员 | 使用扫码枪抽检物料或箱码，登记抽检结果 |
| 封箱员 | 扫码装箱、绑定箱码、打印/粘贴封箱单 |
| DNA 录入员 | 对大件产品录入 DNA 系统编号 |
| 物控/装车库 | 确认发厂、触发物流发运 |
| 物流公司 | 填写物流单号、上传对账单、确认改价 |
| 财务 | 核价、改价审核、发起报销 |
| 用户/客户 | 接收通知、提供签收信息 |
| 工厂/总部财务 | 确认费用、处理报销 |

## 3. 主流程

```text
1. 发货资料完善
2. 打印备料/发货相关单据
3. 包管员扫码拣配
4. 系统校验拣配完成
5. 质量员扫码抽检
6. 抽检通过后进入封箱
7. 封箱员扫码封箱，生成箱明细
8. 判断是否包含大件产品
9. 包含大件产品则录入 DNA
10. 物控/装车库确认发厂
11. 系统通知用户
12. 物流公司填写物流单号
13. 发货单进入运输中
14. 用户签收或业务作废
15. 物流公司上传对账单
16. 财务核价
17. 有改价则多方确认
18. 系统发起报销流程
19. 待报销
20. 已报销
21. 流程结束
```

## 4. 发货单状态机

### 4.1 主状态

| 状态 | 含义 | 允许进入条件 |
| --- | --- | --- |
| DRAFT | 待完善 | 发货任务创建后 |
| WAIT_PRINT | 待打印 | 发货资料完整 |
| WAIT_PICK | 待拣配 | 单据已打印 |
| PICKING | 拣配中 | 包管员开始扫码 |
| WAIT_QC | 待抽检 | 应拣物料全部扫码完成 |
| QC_CHECKING | 抽检中 | 质量员开始扫码 |
| WAIT_PACK | 待封箱 | 抽检通过 |
| PACKING | 封箱中 | 封箱员开始扫码 |
| WAIT_DNA | 待录入 DNA | 已封箱且包含大件产品 |
| WAIT_FACTORY_CONFIRM | 待确认发厂 | 已封箱且 DNA 校验完成或无需 DNA |
| WAIT_WAYBILL | 待物流单号 | 已确认发厂 |
| IN_TRANSIT | 运输中 | 物流公司已填写物流单号 |
| SIGNED | 已签收 | 用户签收完成 |
| WAIT_RECONCILE | 待对账 | 已签收或已产生物流费用 |
| RECONCILING | 对账中 | 物流公司已上传对账单 |
| WAIT_REIMBURSE | 待报销 | 对账确认完成 |
| REIMBURSED | 已报销 | 报销完成 |
| VOIDED | 已作废 | 作废审批通过 |
| FINISHED | 已结束 | 签收和费用闭环均完成 |

### 4.2 状态控制规则

- 未打印不能拣配。
- 拣配、抽检、封箱必须通过扫码枪完成，不能只靠人工点击通过。
- 抽检不通过时退回 `WAIT_PICK` 或进入异常处理。
- 封箱完成后物料原则上不能直接修改，必须走异常流程。
- 包含大件产品时，未完成 DNA 录入不能确认发厂。
- 未确认发厂不能填写物流单号。
- 未填写物流单号不能进入运输中。
- 已作废单据不能继续发货，但如已产生物流费用，允许继续进入费用对账/报销。
- 已签收不能直接作废，只能走异常冲销。

## 5. 扫码枪作业设计

扫码枪按键盘输入处理，前端页面必须支持输入框自动聚焦、扫码后自动提交、连续扫描、成功/失败提示音、异常原因提示。

### 5.1 扫码通用流程

```text
扫码 -> 解析条码 -> 识别业务场景 -> 校验 -> 写入扫码记录 -> 更新作业进度 -> 状态推进或异常拦截
```

### 5.2 拣配扫码

扫描对象：

- 发货单号
- 物料码
- SKU 码
- 箱码，若物料已预装箱

校验规则：

- 条码必须属于当前发货单。
- 物料必须在应拣清单内。
- 实扫数量不能超过计划数量。
- 同一物料码不能重复扫描，除非业务定义为可计数码。
- 物料不能已被其他发货单占用。

状态推进：

- 部分完成：保持 `PICKING`。
- 全部完成：进入 `WAIT_QC`。
- 异常：记录失败扫码并生成拣配异常。

### 5.3 抽检扫码

扫描对象：

- 发货单号
- 物料码
- SKU 码
- 箱码

校验规则：

- 发货单必须已完成拣配。
- 扫描对象必须属于当前发货单。
- 抽检结果必须登记为通过或不通过。
- 抽检不通过必须填写原因。

状态推进：

- 抽检通过：进入 `WAIT_PACK`。
- 抽检不通过：退回 `WAIT_PICK` 或进入异常处理。

### 5.4 封箱扫码

扫描对象：

- 发货单号
- 箱码
- 物料码
- 封箱单码

校验规则：

- 物料必须已拣配完成。
- 抽检必须通过。
- 箱码必须唯一。
- 箱内实装物料必须属于当前发货单。
- 同一物料不能重复装箱或跨箱冲突。

状态推进：

- 封箱未完成：保持 `PACKING`。
- 全部封箱完成且包含大件产品：进入 `WAIT_DNA`。
- 全部封箱完成且不包含大件产品：进入 `WAIT_FACTORY_CONFIRM`。

## 6. DNA 录入规则

大件产品由物料主数据标识：

```text
sku.is_large_item = true
```

发货单只要包含任意大件产品，即：

```text
shipment.has_large_item = true
shipment.dna_required = true
```

规则：

- 包含大件产品必须录入 DNA。
- DNA 录入完成后才能确认发厂。
- DNA 编号必须与发货单、物料、箱码关联。
- DNA 记录必须保留录入人、录入时间、校验结果。

## 7. 对账与报销流程

### 7.1 正常费用流程

```text
物流公司上传对账单 -> 财务核价 -> 无改价 -> 自动发起报销 -> 待报销 -> 已报销
```

### 7.2 改价流程

```text
物流公司上传对账单 -> 财务核价 -> 有改价 -> 物流公司确认 -> 工厂确认 -> 总部财务确认 -> 自动发起报销
```

改价必须记录：

- 改价前金额
- 改价后金额
- 改价原因
- 发起人
- 确认人
- 确认时间
- 附件

### 7.3 费用项

| 字段 | 含义 |
| --- | --- |
| base_fee | 基础运费 |
| delivery_fee | 送货费 |
| transfer_fee | 中转费 |
| delay_days | 延期天数 |
| delay_deduct_fee | 延期扣费 |
| other_fee | 其他费用 |
| total_fee | 总费用 |
| adjusted_total_fee | 改价后总费用 |

## 8. 数据模型

### 8.1 发货单 shipment_order

| 字段 | 含义 |
| --- | --- |
| id | 主键 |
| shipment_no | 发货单号 |
| customer_name | 客户名称 |
| receiver_name | 收货人 |
| receiver_phone | 收货电话 |
| receiver_address | 收货地址 |
| status | 主状态 |
| has_large_item | 是否包含大件产品 |
| dna_required | 是否需要 DNA |
| dna_status | DNA 状态 |
| logistics_company_id | 物流公司 |
| waybill_no | 物流单号 |
| signed_at | 签收时间 |
| voided_at | 作废时间 |
| created_by | 创建人 |
| created_at | 创建时间 |
| updated_at | 更新时间 |

### 8.2 发货物料 shipment_item

| 字段 | 含义 |
| --- | --- |
| id | 主键 |
| shipment_id | 发货单 ID |
| sku_code | SKU |
| material_code | 物料码 |
| item_name | 物料名称 |
| planned_qty | 计划数量 |
| picked_qty | 已拣数量 |
| packed_qty | 已装箱数量 |
| is_large_item | 是否大件 |

### 8.3 扫码记录 scan_record

| 字段 | 含义 |
| --- | --- |
| id | 主键 |
| shipment_id | 发货单 ID |
| shipment_no | 发货单号 |
| business_type | PICK / QC / PACK / DNA / SHIP |
| scan_code | 扫描内容 |
| scan_code_type | ORDER / SKU / MATERIAL / BOX / DNA / WAYBILL |
| operator_id | 操作人 |
| operator_role | 操作角色 |
| device_no | 扫码枪编号 |
| scan_result | SUCCESS / FAILED |
| fail_reason | 失败原因 |
| created_at | 扫码时间 |

### 8.4 箱信息 package_box

| 字段 | 含义 |
| --- | --- |
| id | 主键 |
| box_no | 箱码 |
| shipment_id | 发货单 ID |
| status | 待封箱 / 已封箱 / 已作废 |
| sealed_by | 封箱人 |
| sealed_at | 封箱时间 |

### 8.5 箱内物料 package_box_item

| 字段 | 含义 |
| --- | --- |
| id | 主键 |
| box_id | 箱 ID |
| shipment_item_id | 发货物料 ID |
| sku_code | SKU |
| material_code | 物料码 |
| planned_qty | 计划数量 |
| actual_qty | 实装数量 |

### 8.6 物流对账 logistics_reconciliation

| 字段 | 含义 |
| --- | --- |
| id | 主键 |
| shipment_id | 发货单 ID |
| logistics_company_id | 物流公司 |
| statement_file_id | 对账单附件 |
| base_fee | 基础运费 |
| delivery_fee | 送货费 |
| transfer_fee | 中转费 |
| delay_days | 延期天数 |
| delay_deduct_fee | 延期扣费 |
| other_fee | 其他费用 |
| total_fee | 总费用 |
| adjusted_total_fee | 改价后总费用 |
| price_changed | 是否改价 |
| change_reason | 改价原因 |
| status | 对账状态 |
| created_at | 创建时间 |

## 9. 页面规划

| 页面 | 主要功能 |
| --- | --- |
| 发货任务列表 | 查询状态、客户、物流单号、是否异常、是否对账 |
| 发货详情 | 基础信息、物料、箱明细、扫码记录、物流信息、费用信息 |
| 打印工作台 | 打印备料单、发货单、封箱单 |
| 拣配扫码台 | 连续扫码、显示应拣/已拣/缺失/异常 |
| 抽检扫码台 | 扫码抽检、登记结果、退回异常 |
| 封箱扫码台 | 绑定箱码、录入箱内物料、打印封箱单 |
| DNA 录入页 | 大件产品 DNA 录入与校验 |
| 发厂确认页 | 确认发厂、通知用户、生成物流任务 |
| 物流公司门户 | 填写物流单号、上传对账单、确认改价 |
| 财务对账页 | 核价、改价、确认、发起报销 |
| 异常处理页 | 拣配异常、抽检异常、封箱异常、物流异常、费用异常 |

## 10. 接口规划

### 10.1 扫码接口

```http
POST /api/scan
```

请求：

```json
{
  "shipmentNo": "FH202605180001",
  "businessType": "PICK",
  "scanCode": "MAT-001",
  "deviceNo": "SCAN-01"
}
```

响应：

```json
{
  "success": true,
  "message": "扫码成功",
  "nextStatus": "PICKING",
  "progress": {
    "plannedQty": 10,
    "completedQty": 6
  }
}
```

### 10.2 状态推进接口

```http
POST /api/shipments/{shipmentNo}/actions/{action}
```

常用 action：

```text
confirm-print
complete-pick
complete-qc
complete-pack
complete-dna
confirm-factory
bind-waybill
sign
void
submit-reconciliation
confirm-reconciliation
start-reimburse
complete-reimburse
```

### 10.3 物流公司接口

```http
POST /api/logistics/waybills
POST /api/logistics/reconciliations
POST /api/logistics/reconciliations/{id}/confirm-price-change
```

## 11. 第一版交付范围

第一版必须包含：

- 发货单创建、资料完善、打印标记
- 扫码拣配
- 扫码抽检
- 扫码封箱
- 箱码与箱内物料明细
- 大件产品 DNA 录入校验
- 发厂确认
- 物流单号录入
- 签收和作废
- 对账单上传
- 财务核价
- 改价确认
- 报销状态跟踪
- 操作日志和扫码记录

第一版暂不包含：

- 实时车辆定位
- 路线优化
- 自动派车
- 完整库存 WMS
- 复杂费用规则引擎
- 多承运商自动比价

## 12. 验收场景

| 场景 | 预期结果 |
| --- | --- |
| 正常发货 | 从资料完善到已报销完整闭环 |
| 拣配少扫 | 不能进入抽检 |
| 拣配多扫 | 系统拦截并记录失败原因 |
| 扫错物料 | 系统提示不属于当前发货单 |
| 抽检不通过 | 退回拣配或进入异常处理 |
| 未抽检封箱 | 系统禁止封箱 |
| 箱码重复 | 系统禁止绑定 |
| 大件未录 DNA | 系统禁止确认发厂 |
| 未填物流单号 | 系统禁止进入运输中 |
| 已作废继续发货 | 系统禁止继续发货 |
| 已作废但有费用 | 允许进入费用对账 |
| 对账无改价 | 自动进入报销流程 |
| 对账有改价 | 必须多方确认后才能报销 |

