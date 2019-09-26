import React from 'react';
import { NextPageContext } from 'next'

import { AuthPage, Props as AuthProps } from '@components/App/AuthPage'
import { useCommissionsStore } from '@store/commission';
import { initializeStore } from '@app/store'
import { is_server } from '@utility/misc';
import {  Commission } from '@db/models'


interface Props extends AuthProps {
    commissionsStoreState: object
}

class CommissionsPage extends AuthPage<Props> {

    constructor(props) {
        super(props)
        initializeStore({useCommissionsStore}, props.commissionsStoreState)
    }


    static async getInitialProps(ctx: NextPageContext) {
        const props = await super.getInitialProps(ctx)

        let commissionsStoreState = {
            commissions: []
        }

        if (is_server() && props.useUserState.current_user) {
            commissionsStoreState.commissions = await Commission.find_related(props.useUserState.current_user._id)
        }

        return {
            commissionsStoreState,
            ...props
        }
    }

}

export default CommissionsPage;