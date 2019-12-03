import React from 'react'
import { useCommissionStore } from '@client/store/commission'
import { Grid, Row, Col, Placeholder, List, Icon } from 'rsuite'
import { PanelContainer } from '@components/App/MainLayout'
import { t } from '@utility/lang'
import { ApprovalButtons } from './CommissionProcess'
import UserInfoCard from '@components/User/UserInfoCard'
import { CommissionCard } from '@components/Profile/ProfileCommission'
import { useUser } from '@hooks/user'
import { useMessageTextToHTML } from '@hooks/db'
import { get_profile_name } from '@utility/misc'

const CommissionDescription = () => {
    const user = useUser()
    const store = useCommissionStore()

    let commission = store.get_commission()

    let is_owner = user._id === commission.from_user._id

    let descr_html = useMessageTextToHTML(commission.body)

    return (
        <Grid fluid>
            <Row>
                <Col xs={24}>
                    <UserInfoCard
                        notBodyFill
                        data={commission.from_user}
                        text={<span>{t`is requesting a commission from`} <span className="name">{get_profile_name(commission.to_user)}</span></span>}>
                        <CommissionCard
                            noCover
                            data={commission.rate}
                            extras={commission.extras}
                        />
                        {!is_owner && (
                            <div className="text-center">
                                <hr />
                                {!commission.accepted && !commission.finished && (
                                    <>
                                        <p>{t`Waiting for your approval.`}</p>
                                        <p>
                                            <ApprovalButtons />
                                        </p>
                                    </>
                                )}
                                {commission.accepted && (
                                    <p>{t`You approved of this request.`}</p>
                                )}
                                {!commission.accepted &&
                                    commission.finished && (
                                        <p>{t`You declined this commission request.`}</p>
                                    )}
                            </div>
                        )}
                    </UserInfoCard>
                </Col>
            </Row>
            <Row>
                <Col xs={24}>
                    <h4 className="pb-1 mb-2">{t`Information`}</h4>
                    {!!!descr_html && <Placeholder.Paragraph rows={8} />}
                    {!!descr_html && <p dangerouslySetInnerHTML={{ __html: descr_html }} />}
                </Col>
            </Row>
            <Row>
                <Col xs={24}>
                    <h4 className="pb-1 mb-2">{t`Attachments`}</h4>
                    <PanelContainer bordered>
                        <List hover>
                            {commission.attachments.map(v => {
                                return (
                                    <a href={v.url} className="unstyled" key={v._id}>
                                    <List.Item>
                                        <div className="pl-2">
                                            <Icon icon="file" className="mr-2"/> {v.name}
                                        </div>
                                    </List.Item>
                                    </a>
                                )
                            })}
                        </List>
                    </PanelContainer>
                </Col>
            </Row>
        </Grid>
    )
}

export default CommissionDescription
