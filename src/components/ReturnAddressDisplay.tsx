'use client'

import React from 'react'
import { useField } from '@payloadcms/ui'

/**
 * ReturnAddressDisplay - 归还地址显示组件（带复制功能）
 * TODO: 实现完整的地址显示和一键复制功能
 */
const ReturnAddressDisplay: React.FC = () => {
  const { value } = useField<any>()

  // 临时占位组件，暂不显示任何内容
  return null

  // TODO: 未来实现类似这样的功能
  // const returnAddress = value?.return_address
  // if (!returnAddress) return null

  // return (
  //   <div>
  //     <p>收件人：{returnAddress.contact_name}</p>
  //     <p>电话：{returnAddress.contact_phone}</p>
  //     <p>地址：{returnAddress.province}{returnAddress.city}{returnAddress.district}{returnAddress.address}</p>
  //     <button onClick={() => copyToClipboard()}>复制地址</button>
  //   </div>
  // )
}

export default ReturnAddressDisplay
