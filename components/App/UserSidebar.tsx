import React from 'react';
import { Grid, Col, Row, Divider } from 'rsuite';

import {NavUserSidebar} from '@components/Header/NavUser'
import { Avatar } from '@components/Profile/ProfileHeader'
import { ProfileNameTag } from '@components/Profile'
import useUserStore from '@store/user';
import * as pages from '@utility/pages'

import { t } from '@app/utility/lang'

import './UserSidebar.scss'
import Link from 'next/link';

interface Props {
    activeKey?: string
}

const UserSidebar = (props: Props) => {
    const [state, actions] = useUserStore()
    const user = state.current_user

    let active_comm_count = state.active_commissions_count

    if (user.type === 'consumer') {
        active_comm_count += state.active_requests_count
    }

    return (
        <Grid fluid className="user-sidebar animate-width">
            <Row>
                <Col xs={24} className="text-center">
                    <Avatar/>
                </Col>
                <Col xs={24} className="text-center">
                    <ProfileNameTag name={user.name || user.username}/>
                </Col>
            </Row>
            <Row>
                <Col xs={user.type === 'creator' ? 12: 24} className="text-center stat-info">
                    <Link href={pages.commissions}>
                        <a className="unstyled">
                            <strong className="text-primary">{active_comm_count}</strong>
                            <small>{t`Commissions`}</small>
                        </a>
                    </Link>
                </Col>
                {user.type === 'creator' &&
                <Col xs={12} className="text-center stat-info">
                    <Link href={pages.commission_requests}>
                        <a className="unstyled">
                            <strong className="text-primary">{state.active_requests_count}</strong>
                            <small>{t`Requests`}</small>
                        </a>
                    </Link>
                </Col>
                }
            </Row>
            <hr/>
            <Row>
                <Col xs={24}>
                    <NavUserSidebar activeKey={props.activeKey}/>
                </Col>
            </Row>
        </Grid>
    );
};

export default UserSidebar;