$(function(){
	goAct = submitAjax();
	student_data 		 = {};
	activity_student = '';
	active_que_type  = '';
	d_end 					 = '';
	activity_total_items = 0;
	answered 				= 0;
	cheating_count 	= 0;
	time_lapse			= 0;
	tlimit 					= 0;
	tlapse 					= 0;	
	show_alert			= false;
	has_essay 			= false;      
	do_insert_cheat = false;
	getStudAct(`${localStorage.uid}-${localStorage.auth}-${assign_id}`);

	// checkStatus();
	connectionListener();
	
	$('body').bind('copy cut paste',function(e) {
    e.preventDefault(); return false;
	});

	$(window).on('beforeunload',function(){
		if(show_alert){
			if($('#timer').text() == '00:00:00') student_data.time = 0;
			saveActivity(student_data);
			setTimeout(userDidNotLeave, 2000);
			return 'Are you sure you want to do this action?';
		}
	});

	function userDidNotLeave(){
		saveActivity(student_data, 1);
	}
	
	$(window).blur(function() {
		if(do_insert_cheat) cheating_count++;
		isCheating();
	});

	$(document).on('click', '#take_activity', function(){
		swal({
      title: 'Take Activity?',
      html: "Are you sure you want to take this activity?",
      type: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Take now',
    }).then(function (result) {
      	if(result.value){

      		swal({
			      title: 'Loading Questions',
			      html: 'Please wait ...',
			      allowOutsideClick: () => !swal.isLoading(),
			      onOpen: () => {
			        swal.showLoading();
			      }
			    });

			    if(window.navigator.onLine){
						let data = {'f' : 'takeActivity', assign_id};
						
	      		goAct.ajax_submit(data, callback, 'json', function(data){
	      			swal.close();
	      			if (data.status == 0){
	      				alertMsg(data.title, data.msg, data.type);
	      				show_alert = false;
	      			}else{
	      				show_alert = true;
	      				$('#activity_details_div').remove();
		      			$('#activity_all_div').removeClass('hide');
		      			activity_student = data.activity_student;
								addQueType(data.questions); 
								
								$('#activity_question_type').find('a:first').click();
								let que_type = $('#activity_question_type').find('a:first').attr('data-que-type');
								$(`#${que_type}_que_list`).find('div:first').removeClass('hide');
								active_que_type = que_type;
								do_insert_cheat = true;
								tlimit = data.tlimit;
								tlapse = data.tlapse;
								d_end  = data.d_end;
								
								var seconds	= data.tlimit * 60;
								$('#timer').countdown({
									until 	: seconds,
									format 	: 'HMS',
									onTick 	: getTime,
									tickInterval: 1,
									layout 	: '{h<}{hnn}{h>}:{m<}{mnn}{m>}:{snn}',
								});

								function getTime(periods){
									var date_now = new Date();
									var now 		 = moment(date_now).tz("Asia/Manila").format('YYYY-MM-DD HH:mm:ss');
									var sec  		 = $.countdown.periodsToSeconds(periods);
									student_data = {time: $.countdown.periodsToSeconds(periods), 
																	limit: tlimit, lapse: tlapse, assign_id, d_end,
																	act_stud_id: activity_student, date_end: now,
																	uid: localStorage.uid, auth: localStorage.auth};
									saveStudentAct(student_data);

									localStorage.setItem(`timer-${activity_student}`, sec);
									$(this).removeClass('-danger is-countdown');

									if(sec <= 60 && sec > 0){
										$(this).addClass('-danger');
								  } else if(sec == 0) {
										$(this).removeClass('-danger'); 
										autoSubmit();
								  } 
								}
	      			}
	      		})
      		} else alertMsg('Whoops!', 'Please check your internet connection.', 'error');      		
      	}
    });
	})

	$(document).on('click', '.que_type_toggle', function(){
		let que_type = $(this).attr('data-que-type');
		active_que_type = que_type;
		$('.-page_wrapper').animate({
        scrollTop: ($('#questions_div').position().top - 300)}, 'slow');
	})

	$(document).on('click', '#activity_question_type > li', function(){
		var index = $(this).index();
		var total = $(this).siblings('li').length + 1;
		var l_btn = total - index;
		
		if(index == 0){
			$('#prev_btn').addClass('hide');
		}else{
			$('#prev_btn').removeClass('hide');
		}

		if(l_btn == 1){
			$('#next_btn').addClass('hide');	
		}else{
			$('#next_btn').removeClass('hide');	
		}

	});

	$(document).on('click', '#prev_btn', function(){
		let div 		= $('#activity_question_type');
		let index 	= div.find('.active').index();
		let to_show	= index - 1;

		if(index != 0){
			div.children(`li:eq(${to_show})`).find('a').click();
			$('.-page_wrapper').animate({
        scrollTop: ($('#questions_div').position().top - 300)},
        'slow');

			if(index == 1){
				$(this).addClass('hide');
			}else{
				$(this).removeClass('hide');
			}
			$('#next_btn').removeClass('hide');
		}
	})

	$(document).on('click', '#next_btn', function(){
		let div 		= $('#activity_question_type');
		let ttl 		= div.children('li').length;
		let index 	= div.find('.active').index();
		let to_show	= index +1;
		let l_btn 	= ttl - to_show;
		if(to_show < ttl){
			div.children(`li:eq(${to_show})`).find('a').click();
			$('.-page_wrapper').animate({
        scrollTop: ($('#questions_div').position().top - 300)},
        'slow');

			if(l_btn == 1){
				$(this).addClass('hide');
			}else{
				$(this).removeClass('hide');
			}

			$('#prev_btn').removeClass('hide');
		}
	})

	$(document).on('click', '#finish_activity', function(){
		finalizeAnswer(0, 0, 1);
	})

	$(document).on('click', '.select_choice', function(e){
		e.preventDefault();
		var timer = $('#timer').text();

		if(timer != '00:00:00'){
			if(!$(this).attr("disabled")){
				len = $(this).parent('div').parent('div').find('label.isSelected').removeClass('isSelected');
				$(this).addClass('isSelected');
				$(this).parent().parent().find('.isAnswered').removeClass('isAnswered');
				$(this).parent().addClass('isAnswered');
				if(len.length == 0){
					answered++;
					add = (100 / activity_total_items) * answered;
					$("#activity_progress").css('width', `${add}%`)
					$('#answered_span').html(answered);
					count = $('#mc_que_list').find('label.isSelected').length
					$('#mc_ans_count').html(count);
				}
				var answer	= $(this).parent().parent().find('.isAnswered').index();
				submitAnswer($(this).closest('.q_div'), String.fromCharCode(65 + answer))
			}
		} else autoSubmit();
	});

	$(document).on('click', '.tof_ans_select', function(e){
		e.preventDefault();
		var timer = $('#timer').text();

		if(timer != '00:00:00'){
			if(!$(this).attr("disabled")){
				len = $(this).parent('div').parent('div').find('label.isSelected').removeClass('isSelected');
				$(this).addClass('isSelected');
				if(len.length == 0){
					answered++;
					add = (100 / activity_total_items) * answered;
					$("#activity_progress").css('width', `${add}%`)
					$('#answered_span').html(answered);
					count = $('#tof_que_list').find('label.isSelected').length
					$('#tof_ans_count').html(count);
				}

				var answer = $(this).attr('data-tof-answer');
				submitAnswer($(this).closest('.q_div'), answer);
			}
		} else autoSubmit();
	})

	$(document).on('keyup, blur', '.fitb_answer_input', function(e){		
		var timer  = $('#timer').text();
		var answer = $.trim($(this).val());

		if(timer != '00:00:00'){
	    if(answer != "") {
				if(!$(this).hasClass('isAnswered')){
					$(this).addClass('isAnswered');
					answered++;
					add = (100 / activity_total_items) * answered;
					$("#activity_progress").css('width', `${add}%`)
					$('#answered_span').html(answered);
					count = $('#fitb_que_list').find('input.isAnswered').length
					$('#fitb_ans_count').html(count);
				}

				delay(() => {
					submitAnswer($(this).closest('.q_div'), answer, 1);
				}, 500);
			}
		} else autoSubmit();
	});

	$(document).on('keyup, blur', '.ess_answer_input', function(e){		
		var timer = $('#timer').text();

		if(timer != '00:00:00'){
	    let parent_div = $(this).parent('div').parent('div');
			let this_min   = parseInt(parent_div.find('.ess_min_word').html());
			let this_max   = parseInt(parent_div.find('.ess_max_word').html());
			let word_count = parseInt(parent_div.find('.ess_word_count').text());
			let val 			 = $.trim($(this).val());
			let value 	   = getWordCount(val);

			if((this_max == 0 && this_min == 0) || (word_count <= this_max)){
				if(val != ""){

					if(word_count == this_max){
						if(e.keyCode == 32 || e.keyCode == 13){
        			return false;
        		}
					}

					parent_div.find('.ess_word_count').html(value);
					if(!$(this).hasClass('isAnswered')){
						$(this).addClass('isAnswered');
						answered++;
						add = (100 / activity_total_items) * answered;
						$("#activity_progress").css('width', `${add}%`)
						$('#answered_span').html(answered);
						count = $('#ess_que_list').find('textarea.isAnswered').length
						$('#ess_ans_count').html(count);
					}

				}else{
					parent_div.find('.ess_word_count').html("0");
				}
			}else{
				parent_div.find('.ess_word_count').html(value);
	      var limited = $(this).val().slice(0, -1);
	      $(this).val(limited);
			}


			delay(() =>{
				var answer = $.trim($(this).val());
				if(answer != "") submitAnswer($(this).closest('.q_div'), answer, 1);
			}, 500);
		} else autoSubmit();
	});

	function autoSubmit(){
		if(window.navigator.onLine) finalizeAnswer(0, 1, 1);		
	}

	$(document).on('click', '.close_result_btn, #act_btn_back', function(e){
		e.preventDefault();
		window.location.href = base_url + 'class_activity';
	})

	let getActivityDetails = () => {
		let data = {'f' : 'getActivityDetails', assign_id};
    // activityLoading(0);
		goAct.ajax_submit(data, callback, 'json', function(data){
			activityDetails(data);
		});
	}

	let addQueType = data => {

		let total_items = 0;
		let count 			= 0;

		for(let i in data){

			let items 		 = data[i].questions.length;
			let questions 	 = data[i].questions;
				total_items	+= items;

			let html = '';
			if(i == "True or False"){
				html 	= `<li><a class="que_type_toggle" data-que-type="tof" data-toggle="tab" href="#trueOrFalse">True or False  <span><span id="tof_ans_count">0</span>/${items}</span> </a></li>`;
			}else if(i == "Multiple Choice"){
				html 	= `<li><a class="que_type_toggle" data-que-type="mc" data-toggle="tab" href="#multipleChoice">Multiple Choice <span><span id="mc_ans_count">0</span>/${items}</span></a></li>`;
			}else if(i == "Fill in the blanks"){
				html	= `<li><a class="que_type_toggle" data-que-type="fitb" data-toggle="tab" href="#fillInTheBlanks">Fill in the blanks <span><span id="fitb_ans_count">0</span>/${items}</span></a></li>`
			}else if(i == "Essay"){
				html	= `<li><a class="que_type_toggle" data-que-type="ess" data-toggle="tab" href="#essay">Essay <span><span id="ess_ans_count">0</span>/${items}</span></a></li>`;
				has_essay = true;
			}else if(i == "Enumeration"){
				html 	= `<li><a class="que_type_toggle" data-que-type="enum" data-toggle="tab" href="#enumeration">Enumeration <span><span id="enum_ans_count">0</span>/${items}</span></a></li>`;
			}

			$('#activity_question_type').append(html);
			addQuestions(i, questions);
			count++;
		}

		if(count == 1){
			$('#prev_btn').addClass('hide');
			$('#next_btn').addClass('hide');
		}

		$('#out_of_span').html(total_items);
	}

	let activityDetails = data => {
		$('#class_name').html(data.class_name)
		type = data.activity_type == 1 ? 'Assessment' : (data.activity_type == 2 ? 'Seatwork' : 'Homework');
		$('#activity_type').html(type);
		$('#date_start').html(data.date_start);
		$('#date_end').html(data.date_end);
		$('#activity_title').html(data.title);
		$('#activity_direction').html('Direction: ' + data.instruction);
		$('#teacher_name').html(data.teacher_name);
		$('#teacher_img').attr('src', data.teacher_img)
		$('#total_points').html(data.total_points + " point(s)");
		$('#total_time').html(data.time_limit);
		$('#timer').html(data.time_limit)
		$('#total_items').html(data.total_items + " item(s)");
		$('#activity_title_result').html(data.title);
		$('#total_duration').html(data.duration);
		activity_total_items = parseFloat(data.total_items);
    if ($.isEmptyObject(data)) {
      $('#act_loader').text('Unable to load activity!');
    } else{
      $('.act-loaded').removeClass('hide');
      $('.act-loading').addClass('hide');
    }
	}

	let addQuestions = (que_type, data) =>{

		let count 			= 1;
		let is_disabled	= "";
		let is_answered = "";
	
    for(var q in data){
      var question = data[q];
      var img_class = (question.image == '') ? 'hide' : '';
			
			console.log({img_class});
			let do_hide	= count == 1 ? 'active_que_div' : '';
			// timer = question.time_limit == 0 ? '' : question.time_limit.replace('.', ':');

			if(question.answer != ""){
				addAnswered(que_type);
				is_disabled = "disabled";
				is_answered = "isAnswered";
			}else{ 
				is_disabled = "";
				is_answered = "";
			}

      var save = `<div class="form-group mt20 pull-right -spn_flexend -success -autosave_success hide" id="autosave_success-${question.id}">
                    <i class="-ic oa_fl_check"></i>Saved
                  </div>`;

			timer = '';
			if(que_type == "True or False"){

				t_class = question.answer == "" ? "" : (question.answer == "TRUE" ? "isSelected" : "");
				f_class = question.answer == "" ? "" : (question.answer == "FALSE" ? "isSelected" : "");

				var html = `<div class="well -well_question q_div ${do_hide}" data-question-id="${question.id}" data-answer-id="${question.answer_id}" data-que-type="tof">
					          <div class="-dv_question_timer">
					            <label for="" class="-lbl_que_timer -danger q_timer" data-timer-value="${timer}" data-time-lapse="0">${timer}</label>
					          </div>
					          <div class="-content">
					            <div class="-que_number">
					              <label for="" class="-points -danger">${question.points + "pt/s"}</label>
					              <label for="" class="-number -info">${count}.)</label>
					            </div>
					            <div class="-question_item">

					              <div class="-files_attached">
                          <button type="button" class="-btn -btn-reload-img ${img_class}"  data-toggle="tooltip" title="Reload Image">
										        <i class="-ic oa_reset"></i>
                          </button>
                  				<img class="-img_preview ${img_class}" loading="lazy" style="width: inherit !important; margin-top: -38px; cursor: pointer;" data-src="${question.image}" src="${question.image}" alt="">
					              </div>

					              <p class="-question_text">${question.question}</p>

					              <div class="form-group w20p">
					                <div class="-dv_radio btn-group">
					                  <label class="btn -el_bg_default -btn_rad tof_ans_select ${t_class}" data-tof-answer="TRUE" ${is_disabled}>
					                    <span class="-spn_text">True</span>
					                    <input name="choices[1]" class="form-control" type="radio" value="1">
					                  </label>
					                </div>
					                <div class="-dv_radio btn-group">
					                  <label class="btn -el_bg_default -btn_rad tof_ans_select ${f_class}" data-tof-answer="FALSE" ${is_disabled}>
					                    <span class="-spn_text">False</span>
					                    <input name="choices[1]" class="form-control" type="radio" value="1">
					                  </label>
					                </div>
                        </div>
                        
                        ${save}
					            </div>
					          </div>
					        </div>`;

				$('#tof_que_list').append(html);
			} else if(que_type == "Multiple Choice"){
                var ch = question.choices;
				let choices = '';
                let x 		= 0;
                
                for(var c in ch){
                    letter = String.fromCharCode(x + 65);

					d_class = letter == question.answer ? "isAnswered" : "";
					l_class = letter == question.answer ? "isSelected" : "";

					choices += `<div class="-dv_radio btn-group ${d_class}">
					          	    <label class="btn -el_bg_default -btn_rad select_choice ${l_class}" data-choice-answer="${letter}"  ${is_disabled}>
					                  <label class="-letter">${letter}</label>
					                  <span class="-spn_text">${ch[c].choice}</span>
					        	        <input name="choices[1]" class="form-control" type="radio" value="1">
                          </label>
					              </div>`;
					x++;   
                }

				var html =	`<div class="well -well_question q_div ${do_hide}" data-question-id="${question.id}" data-answer-id="${question.answer_id}" data-que-type="mc">
					          <div class="-dv_question_timer">
					            <label for="" class="-lbl_que_timer -danger q_timer" data-timer-value="${timer}" data-time-lapse="0">${timer}</label>
					          </div>
					          <div class="-content">
					            <div class="-que_number">
					              <label for="" class="-points -danger">${question.points + "pt/s"}</label>
					              <label for="" class="-number -info">${count}.)</label>
					            </div>
					            <div class="-question_item">

                        <div class="-files_attached">
                          <button type="button" class="-btn -btn-reload-img ${img_class}"  data-toggle="tooltip" title="Reload Image">
                            <i class="-ic oa_reset"></i>
                          </button>
                          <img class="-img_preview ${img_class}" loading="lazy" style="width: inherit !important; margin-top: -38px; cursor: pointer;" data-src="${question.image}" src="${question.image}" alt="">
                        </div>


					              <p class="-question_text">${question.question}</p>

					              <div class="choices_div">
					              	${choices}
					              </div>

                        ${save}
					            </div>
					          </div>
					        </div>`;

				$('#mc_que_list').append(html)

			} else if(que_type == "Fill in the blanks"){

				var html = `<div class="well -well_question q_div ${do_hide}" data-question-id="${question.id}" data-answer-id="${question.answer_id}" data-que-type="fitb">
					          <div class="-dv_question_timer">
					            <label for="" class="-lbl_que_timer -danger q_timer" data-timer-value="${timer}" data-time-lapse="0">${timer}</label>
					          </div>
					          <div class="-content">
					            <div class="-que_number">
					              <label for="" class="-points -danger">${question.points + "pt/s"}</label>
					              <label for="" class="-number -info">${count}.)</label>
					            </div>
					            <div class="-question_item">
                        <div class="-files_attached">
                          <button type="button" class="-btn -btn-reload-img ${img_class}"  data-toggle="tooltip" title="Reload Image">
                            <i class="-ic oa_reset"></i>
                          </button>
                          <img class="-img_preview ${img_class}" loading="lazy" style="width: inherit !important; margin-top: -38px; cursor: pointer;" data-src="${question.image}" src="${question.image}" alt="">
                        </div>
					              <p class="-question_text">${question.question.replace('*', "_____________")}</p>
					              <div class="form-group">
					                <input type="text" name="name" class="form-control -input_sm fitb_answer_input ${is_answered}" placeholder="Enter your answer"  ${is_disabled} value="${question.answer}">
                        </div>
                        
                        ${save}
					            </div>
					          </div>
					        </div>`;

				$('#fitb_que_list').append(html);
			} else if(que_type == "Essay"){
				var word_count 	= question.answer != "" ? getWordCount($.trim(question.answer)) : 0;
				var hide_min 		= question.min_word <= 0 ? 'hide' : '';
				var hide_max 		= question.max_word <= 0 ? 'hide' : '';
				var html = `<div class="well -well_question q_div ${do_hide}" data-question-id="${question.id}" data-answer-id="${question.answer_id}" data-que-type="ess">
					          <div class="-dv_question_timer">
					            <label for="" class="-lbl_que_timer -danger q_timer" data-timer-value="${timer}" data-time-lapse="0">${timer}</label>
					          </div>
					          <div class="-content">
					            <div class="-que_number">
					              <label for="" class="-points -danger">${question.points + "pt/s"}</label>
					              <label for="" class="-number -info">${count}.)</label>
					            </div>
					            <div class="-question_item">

                        <div class="-files_attached">
                          <button type="button" class="-btn -btn-reload-img ${img_class}"  data-toggle="tooltip" title="Reload Image">
                            <i class="-ic oa_reset"></i>
                          </button>
                          <img class="-img_preview ${img_class}" loading="lazy" style="width: inherit !important; margin-top: -38px; cursor: pointer;" data-src="${question.image}" src="${question.image}" alt="">
                        </div>


					              <p class="-question_text">${question.question}</p>
					              <div class="form-group">
					                <textarea name="name" rows="8" cols="20" class="form-control -input_sm -txtarea_answer ess_answer_input ${is_answered}" placeholder="Enter your answer" ${is_disabled}>${question.answer}</textarea>
					              </div>
					              <div class="w100p">
					                <label for="" class="-lbl_text pull-right"> Word Count:  <b class="ess_word_count">${word_count}</b> </label>
					              </div>
					              <div class="w100p ${hide_min}">
					                <label for="" class="-lbl_text"> Minimum Word:  <b class="ess_min_word">${question.min_word}</b> </label>
					              </div>
					              <div class="w100p ${hide_max}">
					                <label for="" class="-lbl_text"> Maximum Word:  <b class="ess_max_word">${question.max_word}</b> </label>
                        </div>
                        
                        ${save}
					            </div>
					          </div>
					        </div>`;

				$('#ess_que_list').append(html);
			}
			count++;
		}
    $('[data-toggle="tooltip"]').tooltip({
      trigger : 'hover'
    });

	}

	let getWordCount = value =>{
		var regex = /\s+/gi;
		return value.trim().replace(regex, ' ').split(' ').length
	}

	let isCheating = () =>{
		if(cheating_count > 0 && activity_student != '' && do_insert_cheat == true) {
			var data 		= {'f':'insertCountCheating', activity_student, cheating_count}
			goAct.ajax_submit(data, callback, 'text', () => { });
		}
	}

	let submitAnswer = (div, answer, input = 0) =>{
		var timer = input == 1 ? 0 : 500;    
    var question_id = div.attr('data-question-id');
    var answer_id		= div.attr('data-answer-id');
    var time_ans    = localStorage.getItem(`timer-${activity_student}`);
    $(`#autosave_success-${question_id}`).addClass('hide');

		delay(() => {						
			var data = {'f' : 'autosaveAnswer', question_id, answer_id, activity_student, answer, time_ans};      
      
			goAct.ajax_submit(data, callback, 'json', function(data){
        if((answer_id == 0 || answer_id == "") && data > 0) div.attr('data-answer-id', data);
        $(`#autosave_success-${question_id}`).removeClass('hide');
        
				if(data == 0){
					show_alert 			= false;
					do_insert_cheat = false;
					
					swal({
						title : 'Whoops!',
						html  : `The activity that you're taking has been reset by your teacher. <br> Please retake the activity.`,
						type  : 'warning',
						allowOutsideClick: false,
						allowEscapeKey: false,
					}).then(function(){
						window.location.href = `${base_url}activity_taking/${assign_id}`;
					});
				}
			});
		}, timer);
	}

	let addAnswered = que_type =>{
		que_type 	= que_type == 'True or False' ? 'tof' : (que_type == 'Multiple Choice' ? 'mc' 
								: (que_type == 'Fill in the blanks' ? 'fitb' : 'ess'));
		count 	 	= $(`#${que_type}_ans_count`).html() == "" ? 1 : parseInt($(`#${que_type}_ans_count`).html()) + 1;
		s_count 	= $('#answered_span').html() == "" ? 1 : parseInt($('#answered_span').html()) + 1;
		$('#answered_span').html(s_count);
		$(`#${que_type}_ans_count`).html(count);
		answered++;

		add = (100 / activity_total_items) * answered;
		$("#activity_progress").css('width', `${add}%`)
	}

	let finalizeAnswer = async (auto = 0, no_time = 0, loaded = 0) => {
		let q_answers 	= [];
		let no_answers	= {'True or False' : [], 'Multiple Choice' : [], 'Fill in the blanks' : [], 'Essay' : []};
		let no_text 		= 'You have no answer on';
		let status 			= 1;

		$('.q_div').each(function(){
			let answer_id	 = $(this).attr('data-answer-id');
			let que_id 		 = $(this).attr('data-question-id');
			let que_type 	 = $(this).attr('data-que-type');
			let time_lapse = $(this).find('.q_timer').attr('data-time-lapse');
			
			if(answer_id == 0){
				if(que_type == 'tof'){
					let answer = $(this).find('.tof_ans_select.isSelected').attr('data-tof-answer');
					if(answer === undefined){
						no_answers['True or False'].push($(this).index() + 1);
						if(!no_text.includes('True or False')){
							no_text += " <br><b>True or False</b> question/s no. " + ($(this).index() + 1);
						} else{
							no_text += ", " + ($(this).index() + 1);
						}
					} else q_answers.push({answer, que_id, answer_id, time_lapse});
					
				}
				
				else if(que_type == 'mc'){
					let answer = $(this).find('.select_choice.isSelected').attr('data-choice-answer');
					if(answer === undefined){
						no_answers['Multiple Choice'].push($(this).index() + 1);
						if(!no_text.includes('Multiple Choice')){
							no_text += " <br><b>Multiple Choice</b> question/s no. " + ($(this).index() + 1);
						} else{
							no_text += ", " + ($(this).index() + 1);
						}
					} else q_answers.push({answer, que_id, answer_id, time_lapse});					
				}
				
				else if(que_type == 'fitb'){
					let answer = $(this).find('.fitb_answer_input').val();
					if(answer == ""){
						no_answers['Fill in the blanks'].push($(this).index() + 1);
						if(!no_text.includes('Fill in the blanks')){
							no_text += " <br><b>Fill in the blanks</b> question/s no. " + ($(this).index() + 1);
						} else{
							no_text += ", " + ($(this).index() + 1);
						}
					} else q_answers.push({answer, que_id, answer_id, time_lapse});				
				}
				
				else if(que_type == 'ess'){
					let answer = $(this).find('.ess_answer_input').val();
					if(answer == ""){
						no_answers['Essay'].push($(this).index() + 1);
						if(!no_text.includes('Essay')){
							no_text += " <br><b>Essay</b> question/s no. " + ($(this).index() + 1);
						}else{
							no_text += ", " + ($(this).index() + 1);
						}
					} else q_answers.push({answer, que_id, answer_id, time_lapse});					
				}
			}
		});

		for(let x in no_answers){
			if(no_answers[x].length != 0){
				status = 0; break;
			}
		}

		if(status == 0 && auto == 0 && no_time == 0){
			swal({
				title: 'Whoops!',
				html: no_text,
				type: 'warning',
				showCancelButton: true,
				confirmButtonText: 'Submit anyway',
			}).then(function (result) {
					if(result.value) doSubmit();					
			});
		} else doSubmit();

		function doSubmit(){
			var has_timer = time_limit = '';
			var modal 		= $('#act_result_modal');
			
			if(auto == 0){
				swal({
					title: 'Submitting answers',
					html: 'Please wait ...',
					allowOutsideClick: () => !swal.isLoading(),
					onOpen: () => {
						swal.showLoading();
					}
				});
			}
	
			if(loaded > 0){
				if(window.navigator.onLine){				
					has_timer  = localStorage.getItem(`timer-${activity_student}`);
					$('#timer').countdown('pause');
				}
			}
      
      var datum = {q_answers, activity_student, loaded, has_timer, tlimit, tlapse};
			goAct.ajax_submit({'f' : 'finalSave', 'datum' : JSON.stringify(datum)}, callback, 'json', function(data){
				if(auto == 0){
					swal.close();
					updateStudActStatus(`${localStorage.uid}-${localStorage.auth}-${assign_id}`);
					
					modal.find('.-name').text(sanitizeThis`${decodeThis(data.name)}`);
					modal.find('.-img_student').attr({'src' : data.img, 'alt': data.name });
					modal.find('.-total').html(data.total_points);
					modal.find('.-time').html(data.time_lapse);
	
					if(has_essay == true) modal.find('.-essay').removeClass('hide');	
					if(data.status == 1){
						modal.find('.-score').html(data.score);
						modal.find('.-score').parents('span.-spn_content').removeClass('hide');
					}
					
					if(data.status == 2){
						swal({
							title : 'Whoops!',
							html  : `The activity that you're taking has been reset by your teacher. <br> Please retake the activity.`,
							type  : 'warning',
							allowOutsideClick: false,
							allowEscapeKey: false,
						}).then(function(){
							window.location.href = `${base_url}activity_taking/${assign_id}`;
						});
					} else{
						modal.modal('show');
						modal.find('.-btn_done').focus();
					}
	
					show_alert 			= false;
					do_insert_cheat = false;
	
					$('#timer').countdown('pause');
					if(localStorage.getItem(`timer-${activity_student}`)) localStorage.removeItem(`timer-${activity_student}`);
				}
			});
		}
	}

	getActivityDetails();

	$(document).on('click', '.-btn-reload-img', function(){
		var d = new Date();
		$(this).siblings('.-img_preview').attr("src", $(this).siblings('.-img_preview').data('src') + '?='+d.getTime());
	});

	$(document).on('click', '.-img_preview', function(){
    $('#q-img-mdl').css('display', 'block');
    $('#q-img-mdl').css('z-index', 99999);
    $('#mdl-img').attr('src', $(this).attr('src'));
	});

	$(document).on('click', '.mdl-close', function(){
    $('#q-img-mdl').css('display', 'none');
	});
});



let activityLoading = (x) => {
  if (!$('#act-loading').hasClass('hide') && $('#act_loader').text() != 'Unable to load activity!') {
    setTimeout(function(){
      if (x > 3) {
        $('#act_loader').text('Loading Activity Details')
        x = 0;
      }
    
      var txt = $('#act_loader').text();
      if (x > 0) {
        txt += ' .';
      }

      x++;
      $('#act_loader').text(txt);
      activityLoading(x);
    }, 1000);
  }
}
ess_word_count <p