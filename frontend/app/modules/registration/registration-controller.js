app.controller('RegistrationController',function (
    $scope,
    $rootScope,
    LoadingMaskService,
    ApplicationService,
    loggedInUser,
    FacebookService,
    ProfileService,
    $location
) {
    console.log('Reg ctrl loaded');
    console.log(loggedInUser);

    $scope.indexNumberStatus = 'unknown'; // unknown,conflict,checking,available,not-found
    $scope.loggedInUser = loggedInUser;
    $scope.invalidUserEmail = false;
    $scope.useAlternateEmail = false;
    $scope.submitting = false;
    $scope.admins = [];

    this.preferedEmail = '';
    this.requestedIndexNumber = '';

    ApplicationService.displayPageHeader();
    ApplicationService.updatePageHeader(loggedInUser);
    LoadingMaskService.deactivate();

    switch (loggedInUser.state){
        case 'verified':
            $location.path(`/profile/${loggedInUser.indexNumber}`);
            break;
        case 'guest':
            $scope.step = 0;
            break;
        case 'pending':
            $scope.step = 4;
            updateAdmins();
            break;
        case 'blocked':
            $scope.step = 5;
            updateAdmins();
            break;
        default:
            console.error('Unknown user state');
            $location.path('/error');
            break;
    }

    ApplicationService.hideNavigationIndicator();

    $scope.goBack = function(){
        $scope.step -= 1;
    };

    $scope.goToStep = function(step){
        $scope.step = step;
    };

    this.ranker = (number) => {
        switch (number){
            case 1:
                return number + "st";
            case 2:
                return number + "nd";
            case 3:
                return number + "rd";
            default:
                return number + "th";
        }
    };

    this.getBatchLabel = function (indexNumber = 0) {
        if (!!$scope.loggedInUser.indexNumber){
            return `${this.ranker(parseInt($scope.loggedInUser.indexNumber.toString().substring(0,2)) - 2)} Batch`;
        }else{
            return 'Unknown';
        }
    };

    this.checkIndexNumberValidity = function (indexNumber = 0) {
        this.requestedIndexNumber = indexNumber;
        if (/^[0-9]{2}0[02]{1}[0-9]{4}$/.test(indexNumber)){
            $scope.indexNumberStatus = 'checking';
            ProfileService.getUserState(indexNumber)
            .then((response)=>{
                $scope.indexNumberStatus = response.data.state;
            })
            .catch((error)=>{
                console.error(error);
            })
        }else{
            $scope.indexNumberStatus = 'unknown';
        }
    };

    this.checkEmailValidity = function (emailAddress = '') {
        if (emailAddress !== ''){
            $scope.useAlternateEmail = true;
            $scope.invalidUserEmail = !/^([0-9a-zA-Z]([-.\w]*[0-9a-zA-Z])*@([0-9a-zA-Z][-\w]*[0-9a-zA-Z]\.)+[a-zA-Z]{2,9})$/.test(emailAddress);
            if (!$scope.invalidUserEmail){
                this.preferedEmail = emailAddress;
            }else{
                this.preferedEmail = '';
            }

        }else{
            $scope.useAlternateEmail = false;
            this.preferedEmail = '';
        }
    };

    this.submit = function () {
        $scope.submitting = true;
        ApplicationService.showNavigationIndicator({
            icon: 'swap_horiz',
            enabled: true,
            text: 'Submitting your request'
        });
        let request = {};
        $scope.useAlternateEmail ? request['email'] = this.preferedEmail : null;
        request['indexNumber'] = this.requestedIndexNumber;
        ProfileService.submitClaimRequest(request)
        .then((_response)=>{
            $scope.step = 4;
            updateAdmins();
            $scope.loggedInUser.state = 'pending';
            $scope.loggedInUser.indexNumber = request['indexNumber'];
            $scope.loggedInUser.alternate_email = request['email'];
            $scope.submitting = false;
            ApplicationService.hideNavigationIndicator();
        })
        .catch((error)=>{
            $scope.submitting = false;
            ApplicationService.hideNavigationIndicator();
            ApplicationService.pushNotification({
                title: 'Unable submit claim request',
                text : 'For some reasons we could not submit your request. Please contact administrator for further assistance.',
                template : 'error',
                autoDismiss : false
            });
        });
    };

    function updateAdmins(){
        ProfileService.getAdmins()
            .then((data)=>{
                $scope.admins = data.data;
            })
            .catch((err)=>{
                ApplicationService.pushNotification({
                    title: 'Unable Get Administrators',
                    text : 'For some reasons we could not fetch the administrators you can contact for further assistance.',
                    template : 'error',
                    autoDismiss : false
                });
            })
    };



});